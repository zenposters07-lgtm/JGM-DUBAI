@echo off
echo =========================================
echo  Pushing JGM Money Transfer to GitHub
echo =========================================
cd /d "%~dp0"

echo Initializing Git repository...
git init

echo Setting user identity...
git config user.name "Agneay"
git config user.email "zenposter07@gmail.com"

echo Adding project files...
git add .

echo Creating commit...
git commit -m "Initial commit for JGM Money Transfer web application"

echo Setting branch to main...
git branch -M main

echo Configuring remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/zenposters07-lgtm/JGM-DUBAI.git

echo Pushing to https://github.com/zenposters07-lgtm/JGM-DUBAI.git...
git push -u origin main

echo =========================================
echo  Successfully pushed to GitHub!
echo =========================================
pause
