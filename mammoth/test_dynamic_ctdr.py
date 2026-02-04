#!/usr/bin/env python3

"""
Simple test script to verify Dynamic-CTDR implementation.
"""

import sys
import os
import torch

# Add mammoth to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backbone import get_backbone
from models.dynamic_ctdr import DynamicCTDR
from argparse import Namespace

def test_dynamic_ctdr():
    # Create mock arguments
    args = Namespace()
    args.lambda_reg = 1000.0
    args.alpha_sensitivity = 1.0
    args.epsilon = 1e-8
    args.lr = 0.01
    args.optim_wd = 0.0
    args.optim_mom = 0.9
    args.optim_nesterov = False
    args.optimizer = 'sgd'
    args.device = 'cpu'
    
    # Create backbone
    backbone = get_backbone('resnet32', num_classes=10)
    
    # Create loss function
    loss = torch.nn.CrossEntropyLoss()
    
    # Create transform (mock)
    transform = None
    
    # Create Dynamic-CTDR model
    model = DynamicCTDR(backbone, loss, args, transform)
    
    print("Dynamic-CTDR model created successfully!")
    
    # Test forward pass
    x = torch.randn(2, 3, 32, 32)
    output = model(x)
    print(f"Forward pass successful! Output shape: {output.shape}")
    
    return model

if __name__ == '__main__':
    model = test_dynamic_ctdr()
    print("Test completed successfully!")