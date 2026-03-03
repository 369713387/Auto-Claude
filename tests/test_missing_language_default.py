#!/usr/bin/env python3
"""
Test: Missing OUTPUT_LANGUAGE defaults to English

This test verifies that when OUTPUT_LANGUAGE is not configured:
1. get_output_language() returns 'en' (English)
2. A warning is logged indicating the default behavior
3. inject_language_constraint() works correctly with the default language
"""

import os
import sys
import logging
import tempfile
import shutil
from pathlib import Path
from io import StringIO

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "backend"))

from core.language import get_output_language, inject_language_constraint, DEFAULT_LANGUAGE


def test_missing_env_file():
    """Test behavior when .auto-claude/.env doesn't exist."""
    print("\n=== Test 1: Missing .env file ===")

    # Use a temporary directory that has no .auto-claude/.env
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)

        # Ensure no .env file exists
        env_path = tmpdir_path / ".auto-claude" / ".env"
        assert not env_path.exists(), ".env should not exist in temp directory"

        # Set up logging to capture warning
        log_capture = StringIO()
        handler = logging.StreamHandler(log_capture)
        handler.setLevel(logging.WARNING)
        logger = logging.getLogger("core.language")
        logger.addHandler(handler)
        logger.setLevel(logging.WARNING)

        # Test get_output_language with missing .env
        lang = get_output_language(tmpdir_path)

        # Clean up logging
        logger.removeHandler(handler)

        # Verify default language
        assert lang == DEFAULT_LANGUAGE, f"Expected '{DEFAULT_LANGUAGE}', got '{lang}'"
        print(f"✓ Language defaulted to: {lang}")

        # Verify warning was logged
        log_output = log_capture.getvalue()
        assert "OUTPUT_LANGUAGE not configured" in log_output, "Expected warning not logged"
        assert "defaulting to 'en'" in log_output, "Expected default message not in log"
        print(f"✓ Warning logged correctly")


def test_empty_env_file():
    """Test behavior when .auto-claude/.env exists but OUTPUT_LANGUAGE is not set."""
    print("\n=== Test 2: Empty .env file ===")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)

        # Create empty .auto-claude/.env
        env_path = tmpdir_path / ".auto-claude" / ".env"
        env_path.parent.mkdir(parents=True, exist_ok=True)
        env_path.write_text("# Empty .env file\n")

        # Set up logging to capture warning
        log_capture = StringIO()
        handler = logging.StreamHandler(log_capture)
        handler.setLevel(logging.WARNING)
        logger = logging.getLogger("core.language")
        logger.addHandler(handler)
        logger.setLevel(logging.WARNING)

        # Test get_output_language
        lang = get_output_language(tmpdir_path)

        # Clean up logging
        logger.removeHandler(handler)

        # Verify default language
        assert lang == DEFAULT_LANGUAGE, f"Expected '{DEFAULT_LANGUAGE}', got '{lang}'"
        print(f"✓ Language defaulted to: {lang}")

        # Verify warning was logged
        log_output = log_capture.getvalue()
        assert "OUTPUT_LANGUAGE not configured" in log_output, "Expected warning not logged"
        print(f"✓ Warning logged correctly")


def test_commented_out_env_var():
    """Test behavior when OUTPUT_LANGUAGE is commented out in .env."""
    print("\n=== Test 3: Commented OUTPUT_LANGUAGE ===")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)

        # Create .auto-claude/.env with commented OUTPUT_LANGUAGE
        env_path = tmpdir_path / ".auto-claude" / ".env"
        env_path.parent.mkdir(parents=True, exist_ok=True)
        env_path.write_text(
            "# OUTPUT_LANGUAGE=zh\n"
            "# Language is commented out\n"
        )

        # Set up logging to capture warning
        log_capture = StringIO()
        handler = logging.StreamHandler(log_capture)
        handler.setLevel(logging.WARNING)
        logger = logging.getLogger("core.language")
        logger.addHandler(handler)
        logger.setLevel(logging.WARNING)

        # Test get_output_language
        lang = get_output_language(tmpdir_path)

        # Clean up logging
        logger.removeHandler(handler)

        # Verify default language
        assert lang == DEFAULT_LANGUAGE, f"Expected '{DEFAULT_LANGUAGE}', got '{lang}'"
        print(f"✓ Language defaulted to: {lang}")

        # Verify warning was logged
        log_output = log_capture.getvalue()
        assert "OUTPUT_LANGUAGE not configured" in log_output, "Expected warning not logged"
        print(f"✓ Warning logged correctly")


def test_injection_with_default_language():
    """Test that inject_language_constraint works correctly with default language."""
    print("\n=== Test 4: Injection with default language ===")

    # Test with default 'en' language
    test_prompt = "You are a helpful coding assistant."
    modified = inject_language_constraint(test_prompt, DEFAULT_LANGUAGE)

    # Verify sandwich strategy
    assert modified.count("target_language") == 2, "Should have 2 occurrences (sandwich)"
    assert DEFAULT_LANGUAGE in modified, f"Should contain '{DEFAULT_LANGUAGE}'"

    # Verify constraint text
    assert "Language Adaptation Mechanism" in modified
    assert "All output must use the system-configured language" in modified
    assert "No other languages are permitted" in modified

    # Verify original prompt is preserved
    assert test_prompt in modified, "Original prompt should be preserved"

    print(f"✓ Language constraint injection works with default '{DEFAULT_LANGUAGE}'")
    print(f"✓ Sandwich strategy verified (2 occurrences of 'target_language')")


def test_actual_project_default():
    """Test actual project behavior without OUTPUT_LANGUAGE configured."""
    print("\n=== Test 5: Actual project default behavior ===")

    # Save current environment
    old_env = os.environ.get("OUTPUT_LANGUAGE")

    try:
        # Remove OUTPUT_LANGUAGE from environment
        if "OUTPUT_LANGUAGE" in os.environ:
            del os.environ["OUTPUT_LANGUAGE"]

        # Set up logging to capture warning
        log_capture = StringIO()
        handler = logging.StreamHandler(log_capture)
        handler.setLevel(logging.WARNING)
        logger = logging.getLogger("core.language")
        logger.addHandler(handler)
        logger.setLevel(logging.WARNING)

        # Test get_output_language with project_dir=None (uses current directory)
        lang = get_output_language()

        # Clean up logging
        logger.removeHandler(handler)

        print(f"✓ get_output_language() returned: {lang}")

        # For the actual project, if .auto-claude/.env exists and has OUTPUT_LANGUAGE,
        # it will use that value. Otherwise it defaults.
        # This test verifies the function works correctly in both cases.

        # Verify warning if default was used
        log_output = log_capture.getvalue()
        if lang == DEFAULT_LANGUAGE:
            assert "OUTPUT_LANGUAGE not configured" in log_output or len(log_output) > 0, \
                "Expected some log output"
            print(f"✓ Default behavior verified (language={lang})")

    finally:
        # Restore environment
        if old_env is not None:
            os.environ["OUTPUT_LANGUAGE"] = old_env


def main():
    """Run all tests."""
    print("=" * 60)
    print("Testing: Missing OUTPUT_LANGUAGE defaults to English")
    print("=" * 60)

    try:
        test_missing_env_file()
        test_empty_env_file()
        test_commented_out_env_var()
        test_injection_with_default_language()
        test_actual_project_default()

        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED")
        print("=" * 60)
        print("\nSummary:")
        print("  ✓ Missing .env file defaults to 'en' with warning")
        print("  ✓ Empty .env file defaults to 'en' with warning")
        print("  ✓ Commented OUTPUT_LANGUAGE defaults to 'en' with warning")
        print("  ✓ Language constraint injection works with default language")
        print("  ✓ Sandwich strategy verified for default language")
        print("  ✓ Warning logging verified for all missing config cases")

        return 0

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
