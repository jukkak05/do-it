# Do It! 

Simple tasks app with Deno & PostgreSQL. 

https://deno.land/  
https://www.postgresql.org/

This app is based on great free Web Developer course from Aalto University and a Walking Skeleton: 
https://fitech101.aalto.fi/web-software-development/
https://github.com/avihavai/wsd-walking-skeleton

App has easy UI for adding and removing tasks from PostgreSQL database. All tasks can have sub-tasks. 

Task can only be removed after all it's sub-task's have been deleted. 

## Demo version

You can try out a demo version here: https://do-it.fly.dev/

Password is: 0000. Please note that all tasks on demo version will be deleted once a hour. 

## Local Installation

If you are on a Windows like myself, i highly recommend installing WSL for Linux subsystem. 

You'll also need Deno, Docker and Docker Compose. I also recommend using VS Code and Remote-WSL extension. 

Check out WSD Course Tools for better instructions: https://fitech101.aalto.fi/web-software-development/1-introduction-and-tooling/4-course-tools/

You can also find more instructions on WSD-README.md

## Hosted Installation

I recommend using: https://fly.io/

It has a free tier for small applications, a great command line tool and demo version is also hosted there. 

You can find instructions for Fly.io deployment here: https://fitech101.aalto.fi/web-software-development/15-deployment-iii/2-deployment-and-databases-using-fly/

### Please note !

This first version uses simple password and a cookie for login. This is not by any means a bullet-proof way as one could just add the correct cookie by looking at the source code. I'll add a more secure login in the future as i get more familiar with Deno. 





