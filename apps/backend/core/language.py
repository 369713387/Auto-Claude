"""
Language Constraint Injection
============================

Functions for injecting multilingual output constraints into agent prompts.

This module provides centralized language configuration for all AI agents,
enabling them to automatically adapt their output language based on the
OUTPUT_LANGUAGE environment variable from .auto-claude/.env.

The "sandwich strategy" injects language constraints at both the start and
end of prompts for maximum effectiveness.
"""

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# =============================================================================
# Language Constraint Template
# =============================================================================
# Template for injecting language constraints into agent prompts.
# Uses {target_language} placeholder that gets replaced at runtime.


LANGUAGE_CONSTRAINT_TEMPLATE = """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【Language Adaptation Mechanism】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

System provides runtime variable:

target_language = {target_language}

This is the only permitted output language.

You MUST strictly comply:

1. All output must use the system-configured language
2. No other languages are permitted
3. No language mixing (e.g., Chinese-English)
4. Titles, body, lists, explanations - all use system-configured language
5. For cross-lingual user input:
   - Understand semantic meaning first
   - Reorganize expression in system-configured language
   - No literal translation
6. Professional terminology:
   - Prioritize target language terminology
   - English in parentheses allowed once if necessary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

# Default language when OUTPUT_LANGUAGE is not configured
DEFAULT_LANGUAGE = "en"


def get_output_language(project_dir: Path | None = None) -> str:
    """
    Get the configured output language from environment variables.

    Reads OUTPUT_LANGUAGE from .auto-claude/.env first, then falls back to
    project root .env, then system environment variables. Defaults to 'en'
    (English) if not configured.

    Args:
        project_dir: Optional path to project directory. If not provided,
                     looks for .auto-claude/.env in current directory.

    Returns:
        Language code (e.g., 'en', 'zh', 'fr', 'es', 'de', 'ja')
    """
    # Try to read from .auto-claude/.env first (highest priority)
    if project_dir:
        env_path = project_dir / ".auto-claude" / ".env"
    else:
        # Try current working directory
        env_path = Path.cwd() / ".auto-claude" / ".env"

    output_language = None

    # Try reading from .auto-claude/.env file
    if env_path.exists():
        try:
            with open(env_path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        key, value = line.split("=", 1)
                        key = key.strip()
                        value = value.strip().strip('"\'')
                        if key == "OUTPUT_LANGUAGE":
                            output_language = value
                            break
        except Exception as e:
            logger.debug(f"Failed to read OUTPUT_LANGUAGE from {env_path}: {e}")

    # Fall back to system environment variable
    if not output_language:
        output_language = os.environ.get("OUTPUT_LANGUAGE")

    # Use default if still not set
    if not output_language:
        logger.warning(
            "OUTPUT_LANGUAGE not configured, defaulting to 'en' (English). "
            "Set OUTPUT_LANGUAGE in .auto-claude/.env to configure agent output language."
        )
        output_language = DEFAULT_LANGUAGE
    else:
        logger.debug(f"Output language configured: {output_language}")

    return output_language


def inject_language_constraint(prompt: str, lang: str) -> str:
    """
    Inject language constraint into a prompt using the "sandwich strategy".

    Adds language constraints at both the START and END of the prompt to
    maximize effectiveness. This ensures the agent sees the constraint
    both before and after processing the main prompt content.

    Args:
        prompt: The original agent prompt
        lang: Target language code (e.g., 'en', 'zh', 'fr', 'es', 'de', 'ja')

    Returns:
        Modified prompt with language constraints at both start and end

    Example:
        >>> inject_language_constraint("You are a coder.", "zh")
        returns a prompt with Chinese constraints at start, original content,
        then Chinese constraints again at the end
    """
    # Format the constraint with the target language
    constraint = LANGUAGE_CONSTRAINT_TEMPLATE.format(target_language=lang)

    # Sandwich strategy: constraint at both start and end
    # This reinforces the language requirement and is more effective than
    # a single injection point
    modified_prompt = f"{constraint}\n\n{prompt}\n\n{constraint}"

    logger.debug(f"Injected language constraint for target language: {lang}")

    return modified_prompt
