#!/usr/bin/env python3

import torch
import torch.nn as nn
from models.dynamic_ctdr import DynamicCTDR
from backbone.ResNet32 import ResNet32

def test_dynamic_ctdr():
    # Create a simple ResNet32 backbone
    backbone = ResNet32(num_classes=10)
    
    # Create loss function
    loss = nn.CrossEntropyLoss()
    
    # Create mock args
    class MockArgs:
        def __init__(self):
            self.lambda_reg = 1000.0
            self.alpha_sensitivity = 1.0
            self.epsilon = 1e-8
            self.lr = 0.01
            self.optimizer = 'sgd'
            self.optim_wd = 0.0
            self.optim_mom = 0.9
            self.optim_nesterov = False
            self.device = 'cpu'
            self.label_perc = 1.0
    
    args = MockArgs()
    
    # Create transform (identity for testing)
    transform = None
    
    # Create DynamicCTDR model
    model = DynamicCTDR(backbone, loss, args, transform)
    
    # Test forward pass
    x = torch.randn(4, 3, 32, 32)
    output = model(x)
    print(f"Forward pass successful. Output shape: {output.shape}")
    
    # Test observe method
    labels = torch.randint(0, 10, (4,))
    not_aug_inputs = x.clone()
    
    loss_val = model.observe(x, labels, not_aug_inputs)
    print(f"Observe method successful. Loss: {loss_val:.4f}")
    
    # Test end_task method with mock dataset
    class MockDataset:
        def __init__(self):
            self.train_loader = [(x, labels)]
            self.N_CLASSES = 10
            self.N_TASKS = 5
            self.SETTING = 'class-il'
            self.N_CLASSES_PER_TASK = 2
    
    mock_dataset = MockDataset()
    model.end_task(mock_dataset)
    print("End task method successful.")
    
    return model

if __name__ == '__main__':
    model = test_dynamic_ctdr()
    print("Dynamic-CTDR implementation test passed!")