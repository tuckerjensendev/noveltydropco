#!/bin/bash

# Check if a commit message is provided
if [ -z "$1" ]; then
  echo "Error: Commit message is required."
  exit 1
fi

# Set the default branch to 'dev'
BRANCH="dev"

# If a branch is provided as the second argument, use it
if [ ! -z "$2" ]; then
  BRANCH="$2"
fi

# Stage all changes, commit with the provided message, and push to the specified branch
git add .
git commit -m "$1"
git push origin "$BRANCH"

echo "Changes pushed to branch '$BRANCH'."
