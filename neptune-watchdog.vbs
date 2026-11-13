' ====================================================================
'  NEPTUNE PRINT FARM - 24/7 BACKGROUND HOST WATCHDOG SERVICE
'  Similar to Google Chrome Remote Desktop Host service.
'  Runs silently, auto-starts on boot, and auto-recovers server & tunnel.
' ====================================================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

farmDir = "C:\Users\User\Neptune-Print-Farm"
nodeExe = "C:\nvm4w\nodejs\node.exe"
serverJs = farmDir & "\server\index.js"
cfExe = farmDir & "\tools\cloudflared.exe"

WshShell.CurrentDirectory = farmDir

Function IsPortListening(port)
    On Error Resume Next
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.setTimeouts 2000, 2000, 2000, 2000
    http.Open "GET", "http://127.0.0.1:" & port & "/api/system-info", False
    http.Send
    If Err.Number = 0 Then
        IsPortListening = True
    Else
        IsPortListening = False
    End If
    On Error GoTo 0
End Function

Function IsProcessRunning(procName)
    IsProcessRunning = False
    On Error Resume Next
    Set wmi = GetObject("winmgmts:")
    Set procs = wmi.ExecQuery("Select * from Win32_Process Where Name = '" & procName & "'")
    If Err.Number = 0 And procs.Count > 0 Then
        IsProcessRunning = True
    End If
    On Error GoTo 0
End Function

' Main Watchdog Loop - Runs forever in background
Do
    ' 1. Check if Node.js server is responding on port 3080
    If Not IsPortListening(3080) Then
        WshShell.Run """" & nodeExe & """ """ & serverJs & """", 0, False
        WScript.Sleep 3000
    End If

    ' 2. Check if Cloudflare Tunnel (cloudflared.exe) is running
    If Not IsProcessRunning("cloudflared.exe") Then
        WshShell.Run """" & cfExe & """ tunnel run neptune-farm", 0, False
        WScript.Sleep 3000
    End If

    ' Sleep 10 seconds before next health check
    WScript.Sleep 10000
Loop
