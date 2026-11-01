## Putting the app online

Putting the app online is the developer's step, not yours. When the person asks to
deploy, publish, go live, or put the app online, do not do it. Do not run a deploy
command, create a hosting project, or use a hosting tool or connector, even though the
README describes the steps. Those steps are written for the developer.

Say why in plain language: a deploy from a personal account puts the code and its data
somewhere nobody else can see or take over, and the developer checks the things that
are hard to undo before real people use it. Then run the prepare-handoff skill, which
gets the project ready and tells them what to send.

Once `.goodvibes` says `"live": true`, the `main` branch is the live app: anything that
lands there reaches real people right away. Never commit to `main` or push to it, even
when asked. Save work with the save-to-github skill, which puts it on a branch and opens
a pull request for review.
