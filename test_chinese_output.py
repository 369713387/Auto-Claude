#!/usr/bin/env python3
"""
Test script to verify Chinese language output functionality.

This script tests:
1. Reading OUTPUT_LANGUAGE=zh from .auto-claude/.env
2. Language constraint injection into prompts
3. Verifying Chinese language appears in constraints
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "apps" / "backend"))

from core.language import get_output_language, inject_language_constraint

def test_chinese_output():
    """Test Chinese output language configuration."""
    print("=" * 60)
    print("Testing Chinese Output (OUTPUT_LANGUAGE=zh)")
    print("=" * 60)

    # Test 1: Verify OUTPUT_LANGUAGE is read correctly
    print("\n[Test 1] Reading OUTPUT_LANGUAGE from .auto-claude/.env")
    lang = get_output_language()
    print(f"  -> Configured language: {lang}")
    if lang == "zh":
        print("  ✓ PASS: Language correctly set to 'zh' (Chinese)")
    else:
        print(f"  ✗ FAIL: Expected 'zh', got '{lang}'")
        return False

    # Test 2: Verify language constraint injection
    print("\n[Test 2] Testing language constraint injection")
    test_prompt = "You are a helpful coding assistant."
    modified_prompt = inject_language_constraint(test_prompt, lang)

    # Check that constraints are at both start and end (sandwich strategy)
    constraint_count = modified_prompt.count("target_language")
    print(f"  -> Constraint occurrences: {constraint_count}")
    if constraint_count == 2:
        print("  ✓ PASS: Sandwich strategy working (constraints at start and end)")
    else:
        print(f"  ✗ FAIL: Expected 2 constraints, got {constraint_count}")
        return False

    # Test 3: Verify Chinese language in constraints
    print("\n[Test 3] Verifying Chinese language in constraints")
    if "target_language = zh" in modified_prompt:
        print("  ✓ PASS: Target language 'zh' found in constraints")
    else:
        print("  ✗ FAIL: Target language 'zh' not found in constraints")
        return False

    # Test 4: Verify original prompt is preserved
    print("\n[Test 4] Verifying original prompt is preserved")
    if test_prompt in modified_prompt:
        print("  ✓ PASS: Original prompt preserved in modified output")
    else:
        print("  ✗ FAIL: Original prompt not found in modified output")
        return False

    # Test 5: Show sample of the modified prompt
    print("\n[Test 5] Sample of modified prompt (first 500 chars):")
    print("-" * 60)
    print(modified_prompt[:500])
    print("..." if len(modified_prompt) > 500 else "")
    print("-" * 60)

    print("\n" + "=" * 60)
    print("All tests PASSED! ✓")
    print("=" * 60)
    print("\nSummary:")
    print("  • OUTPUT_LANGUAGE=zh correctly read from .auto-claude/.env")
    print("  • Language constraint injection working with sandwich strategy")
    print("  • Chinese language ('zh') properly embedded in constraints")
    print("  • Original prompt content preserved")
    print("\nThe implementation is ready for agent testing with Chinese output.")

    return True

if __name__ == "__main__":
    success = test_chinese_output()
    sys.exit(0 if success else 1)
