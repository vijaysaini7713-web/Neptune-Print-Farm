Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\User\Neptune-Print-Farm"
WshShell.Run "cmd /c start-farm.bat", 0, False
