#!/usr/bin/env python3

"""
Experiment script to test Dynamic-CTDR on CIFAR-100 with Class-IL setting.
"""

import sys
import os

# Add mammoth to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import main
import argparse

def run_experiment():
    # Create argument parser
    parser = argparse.ArgumentParser()
    args = parser.parse_args([])
    
    # Set arguments for Dynamic-CTDR on CIFAR-100
    args.model = 'dynamic_ctdr'
    args.dataset = 'seq-cifar100'
    args.backbone = 'resnet18'
    args.n_epochs = 10
    args.batch_size = 32
    args.lr = 0.01
    args.lambda_reg = 1000.0
    args.alpha_sensitivity = 1.0
    args.seed = 0
    args.validation = 0.1
    args.device = 'cuda' if torch.cuda.is_available() else 'cpu'
    
    # Run the experiment
    main(args)

if __name__ == '__main__':
    import torch
    run_experiment()