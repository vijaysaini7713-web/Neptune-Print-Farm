Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\User\Neptune-Print-Farm"

' 1. Check if node server is already listening on port 3080
Set oExec1 = WshShell.Exec("cmd /c netstat -ano | findstr :3080 | findstr LISTENING")
sOut1 = oExec1.StdOut.ReadAll
If InStr(sOut1, "LISTENING") = 0 Then
    WshShell.Run "cmd /c ""node server/index.js > data\server.log 2>&1""", 0, False
End If

WScript.Sleep 2000

' 2. Check if cloudflared is already running
Set oExec2 = WshShell.Exec("cmd /c tasklist /FI ""IMAGENAME eq cloudflared.exe"" | findstr cloudflared.exe")
sOut2 = oExec2.StdOut.ReadAll
If InStr(sOut2, "cloudflared.exe") = 0 Then
    WshShell.Run "cmd /c ""tools\cloudflared.exe tunnel run neptune-farm > data\cloudflared.log 2>&1""", 0, False
End If
