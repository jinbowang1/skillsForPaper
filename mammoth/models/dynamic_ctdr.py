# Copyright 2026-present, Wang Jinxiu (王锦绣), Tsinghua University.
# All rights reserved.

import torch
import torch.nn as nn
import torch.nn.functional as F

from models.utils.continual_model import ContinualModel
from utils.args import ArgumentParser


class DynamicCTDR(ContinualModel):
    """Continual learning via Dynamic Cross-Task Discriminative Regularization."""
    NAME = 'dynamic_ctdr'
    COMPATIBILITY = ['class-il', 'domain-il', 'task-il']

    @staticmethod
    def get_parser(parser) -> ArgumentParser:
        parser.add_argument('--lambda_reg', type=float, required=True,
                            help='regularization weight for CTDR')
        parser.add_argument('--alpha_sensitivity', type=float, default=1.0,
                            help='sensitivity scaling factor for dynamic weights')
        parser.add_argument('--epsilon', type=float, default=1e-8,
                            help='small value to avoid division by zero')
        return parser

    def __init__(self, backbone, loss, args, transform, dataset=None):
        super(DynamicCTDR, self).__init__(backbone, loss, args, transform, dataset=dataset)

        self.logsoft = nn.LogSoftmax(dim=1)
        self.checkpoint = None
        self.importance_weights = None
        self.current_task_gradients = None

    def penalty(self):
        if self.checkpoint is None:
            return torch.tensor(0.0).to(self.device)
        else:
            penalty = self.args.lambda_reg * (self.importance_weights * ((self.net.get_params() - self.checkpoint) ** 2)).sum()
            return penalty

    def compute_sensitivity_ratio(self, new_task_grads, old_task_grads):
        """Compute the sensitivity ratio for dynamic importance weighting."""
        # Avoid division by zero
        denominator = torch.abs(old_task_grads) + self.args.epsilon
        sensitivity_ratio = torch.abs(new_task_grads) / denominator
        
        # Apply exponential decay with scaling factor
        dynamic_weights = torch.exp(-self.args.alpha_sensitivity * sensitivity_ratio)
        
        return dynamic_weights

    def end_task(self, dataset):
        # Compute gradients for current task (new task)
        new_task_grads = torch.zeros_like(self.net.get_params())
        
        for j, data in enumerate(dataset.train_loader):
            inputs, labels = data[0], data[1]
            inputs, labels = inputs.to(self.device), labels.to(self.device)
            for ex, lab in zip(inputs, labels):
                self.opt.zero_grad()
                output = self.net(ex.unsqueeze(0))
                loss = -F.nll_loss(self.logsoft(output), lab.unsqueeze(0), reduction='none')
                loss = torch.mean(loss)
                loss.backward()
                new_task_grads += self.net.get_grads() ** 2

        new_task_grads /= (len(dataset.train_loader) * self.args.batch_size)
        
        # If this is the first task, initialize importance weights
        if self.checkpoint is None:
            self.importance_weights = torch.ones_like(self.net.get_params())
        else:
            # Compute gradients for old tasks (using stored checkpoint)
            old_task_grads = torch.zeros_like(self.net.get_params())
            
            # We need to recompute old task gradients using the current model state
            # but this is computationally expensive. Instead, we use the fact that
            # the importance should be inversely proportional to the interference
            # caused by the new task on old parameters.
            
            # For simplicity, we use the stored importance weights as a proxy for old task sensitivity
            # In practice, you might want to store historical gradient information
            old_task_grads = self.importance_weights.clone()
            
            # Compute dynamic importance weights based on sensitivity ratio
            self.importance_weights = self.compute_sensitivity_ratio(new_task_grads, old_task_grads)

        # Update checkpoint
        self.checkpoint = self.net.get_params().data.clone()

    def get_penalty_grads(self):
        if self.checkpoint is None:
            return torch.zeros_like(self.net.get_params())
        return self.args.lambda_reg * 2 * self.importance_weights * (self.net.get_params().data - self.checkpoint)
    
    def observe(self, inputs, labels, not_aug_inputs, epoch=None):
        self.opt.zero_grad()
        outputs = self.net(inputs)
        
        # Add penalty to loss if we have a checkpoint
        if self.checkpoint is not None:
            penalty = self.penalty()
            loss = self.loss(outputs, labels) + penalty
        else:
            loss = self.loss(outputs, labels)
            
        assert not torch.isnan(loss)
        loss.backward()
        
        # Apply penalty gradients if needed
        if self.checkpoint is not None:
            current_grads = self.net.get_grads()
            penalty_grads = self.get_penalty_grads()
            self.net.set_grads(current_grads + penalty_grads)
            
        self.opt.step()

        return loss.item()