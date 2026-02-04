#!/usr/bin/env python3

"""
Minimal test to verify Dynamic-CTDR model structure and basic functionality.
"""

import torch
import torch.nn as nn
from argparse import Namespace

# Import the model
from models.dynamic_ctdr import DynamicCTDR

# Import a simple backbone
from backbone.ResNet32 import ResNet32

def test_model_structure():
    """Test that the model can be instantiated and has correct structure."""
    
    # Create mock arguments
    args = Namespace()
    args.lambda_reg = 1000.0
    args.alpha_sensitivity = 1.0
    args.epsilon = 1e-8
    args.device = 'cpu'
    args.lr = 0.01
    
    # Create a simple backbone
    backbone = ResNet32(num_classes=10)
    
    # Create loss function
    loss = nn.CrossEntropyLoss()
    
    # Create transform (identity for testing)
    transform = nn.Identity()
    
    # Create model
    print("Creating Dynamic-CTDR model...")
    model = DynamicCTDR(backbone, loss, args, transform)
    print("Model created successfully!")
    
    # Test forward pass
    print("Testing forward pass...")
    x = torch.randn(2, 3, 32, 32)  # CIFAR-10 like input
    output = model(x)
    print(f"Forward pass successful! Output shape: {output.shape}")
    
    # Test parameter methods
    print("Testing parameter methods...")
    params = model.net.get_params()
    print(f"Number of parameters: {params.numel()}")
    
    grads = torch.randn_like(params)
    model.net.set_grads(grads)
    retrieved_grads = model.net.get_grads()
    print(f"Gradient methods working! Grad norm: {retrieved_grads.norm().item():.4f}")
    
    return model

if __name__ == '__main__':
    try:
        model = test_model_structure()
        print("\n✅ All basic tests passed!")
        print("Dynamic-CTDR model is ready for integration with the full framework.")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        raise e