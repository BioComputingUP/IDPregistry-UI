#!/usr/bin/zsh

set -e

# First we need to check if everything has been pushed to the GitHub repo
echo "Checking if everything has been pushed to the GitHub repo"
colR='\033[0;91m'
colC='\033[0;36m'
colN='\033[0m'

echo -e "${colC}Checking repo in deploy-check...${colN}"

# Check for local unstaged changes
git diff --exit-code --stat || {
  echo -e "${colR}There are local unstaged changes, fix with git add ...${colN}"
  exit 1
}

# Check for uncommitted changes
git diff --cached --exit-code --stat || {
  echo -e "${colR}There are uncommitted changes, fix with git commit ...${colN}"
  exit 1
}

# Check for remote changes (dry-run)
git push --dry-run --porcelain >/dev/null || {
  echo -e "${colR}There are remote changes, fix with git pull ...${colN}"
  exit 1
}

# Check for unpublished local commits
git push --dry-run --porcelain | grep -q 'up to date' || {
  git status
  echo -e "${colR}There are unpublished local commits, fix with git push ...${colN}"
  exit 1
}

# Check for remote changes using remote update and git status
{ git remote update &>/dev/null && git status -uno; } | grep -q "up to date" || {
  echo -e "${colR}There are remote changes, fix with git pull ...${colN}"
  exit 1
}

echo "Everything is up to date."

# Now we need to change docker context to the production server (ermes)
echo "Changing docker context to ermes"
docker context use ermes

# Enter in the docker directory
echo "Entering in the docker directory"
cd docker

# Now we can build the image on the production server
echo "Building the image on ermes"
docker build -t idpregistry-ui:1.0 .

# Now we start the container
echo "Starting the container in detached mode"
docker run --name idpregistry-ui -d -p 8050:80 idpregistry-ui:1.0
