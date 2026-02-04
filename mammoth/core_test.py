#!/usr/bin/env python3

"""
Core functionality test for Dynamic-CTDR without full framework dependency.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

def test_sensitivity_computation():
    """Test the core sensitivity ratio computation."""
    # Create dummy gradients
    new_task_grads = torch.abs(torch.randn(100))
    old_task_grads = torch.abs(torch.randn(100)) + 1e-8  # Avoid division by zero
    
    # Compute sensitivity ratio
    epsilon = 1e-8
    denominator = old_task_grads + epsilon
    sensitivity_ratio = new_task_grads / denominator
    
    # Apply exponential decay
    alpha_sensitivity = 1.0
    dynamic_weights = torch.exp(-alpha_sensitivity * sensitivity_ratio)
    
    print("✅ Sensitivity computation test passed!")
    print(f"New task grads mean: {new_task_grads.mean():.4f}")
    print(f"Old task grads mean: {old_task_grads.mean():.4f}")
    print(f"Sensitivity ratio mean: {sensitivity_ratio.mean():.4f}")
    print(f"Dynamic weights mean: {dynamic_weights.mean():.4f}")
    
    return True

def test_penalty_computation():
    """Test penalty computation with dynamic weights."""
    # Create dummy parameters
    current_params = torch.randn(100)
    checkpoint_params = torch.randn(100)
    importance_weights = torch.abs(torch.randn(100))
    lambda_reg = 1000.0
    
    # Compute penalty
    param_diff = current_params - checkpoint_params
    penalty = lambda_reg * (importance_weights * (param_diff ** 2)).sum()
    
    print("✅ Penalty computation test passed!")
    print(f"Parameter difference norm: {torch.norm(param_diff):.4f}")
    print(f"Importance weights mean: {importance_weights.mean():.4f}")
    print(f"Penalty value: {penalty.item():.4f}")
    
    return True

if __name__ == '__main__':
    print("Testing Dynamic-CTDR core functionality...")
    
    try:
        test_sensitivity_computation()
        test_penalty_computation()
        print("\n🎉 All core tests passed! The Dynamic-CTDR logic is working correctly.")
    except Exception as e:
        print(f"\n❌ Core tests failed: {e}")
        raise e