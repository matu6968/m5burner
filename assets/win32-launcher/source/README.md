# M5Burner launcher application

## What is this?
It is used for packaging Windows builds, the official version used a simple C# app written in .NET 4.x, so this is a version which does the same thing but with added feedback functionality if the binary can't be located or if the binary throws an error during execution.

## How to compile
The project was made using Visual Studio 2017, but as long as Visual Studio let's you set a .NET 4.x target, you can run it on newer/older versions of Visual Studio (minor changes may be required to run it on newer/older versions)

1. Clone this repo
2. Open this project in Visual Studio (Open --> Project/Solution...) 
3. Select Release target and go to Build tab --> Build target
4. Output is in M5Burner.Launcher/bin/Release/M5Burner.Launcher.exe
