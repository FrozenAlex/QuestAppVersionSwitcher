﻿const patchStatus = document.getElementById("patchStatus");
const squareLoader = `
<div class="loaderContainer">
    <div class="loaderBarRight"></div>
    <div class="loaderBarLeft"></div>
    <div class="loaderBarTop"></div>
    <div class="loaderBarBottom"></div>
    <div class="loaderSpinningCircle"></div>
    <div class="loaderMiddleCircle"></div>
    <div class="loaderCircleHole"></div>
    <div class="loaderSquare"></div>
</div>`

var currentGameVersion = ""

const browser = document.getElementById("browser")
const toastsE = document.getElementById("toasts")
document.getElementById("downgradeframe").src = `https://oculusdb.rui2015.me/search?query=Beat+Saber&headsets=MONTEREY%2CHOLLYWOOD${IsOnQuest() ? `&isqavs=true` : ``}`

function IsOnQuest() {
    return location.host.startsWith("127.0.0.1") ||location.host.startsWith("localhost")
}

fetch("/api/android/device").then(res => res.json().then(res => {
    if(res.sdkVersion <= 29) {
        // Android 10 and below don't need new storage perms
        document.getElementById("requestAppManage").style.display = "none"
        document.getElementById("requestAppObb").style.display = "none"
        document.getElementById("requestAppData").style.display = "none"
    }
}))

function LaunchApp() {
    fetch("/api/android/launch", {
        method: "POST"
    });
}

function BrowserGo(direction) {
    browser.contentWindow.history.go(direction);
}

function OpenSite(url) {
    location = url
}
function CheckFolderPermission() {
    if(!config.currentApp) return;
    fetch("/api/gotaccess?package=" + config.currentApp).then(res => {
        res.json().then(j => {
            if (j.gotAccess) {
                // Do nothing, we already got access to the folder
            } else {
                if(updateAvailable) return 
                CloseGetPasswordPopup();
                OpenRestorePopup();
                GotoStep("12")
            }
        })
    })
}



let toasts = 0;
let currentToasts = 0;
function ShowToast(msg, color, bgc) {
    toasts++;
    currentToasts++;
    let toastId = toasts;
    toastsE.innerHTML += `
    <div id="toast${toastId}" style="background-color: ${bgc}; color: ${color}; padding: 5px; height: 100px; width: 250px; position: fixed; bottom: ${(currentToasts - 1) * 120 + 20}px; right: 30px; border-radius: 10px">
        ${msg}
    </div>
    `;
    setTimeout(() => {
        document.getElementById(`toast${toastId}`).remove();
        currentToasts--;
    }, 5000)
}

if(!IsOnQuest()) {
    // Is not on quest
    document.getElementById("restoreBackup").classList.add("notActive")
    document.getElementById("onPcInfo").classList.remove("hidden")
    document.getElementById("uninstall").classList.add("notActive")
    //document.getElementById("getModsButton").style.display = "none"
    
} else {
    document.getElementById("installModButton").classList.add("notActive")
    document.getElementById("installModButton").style.display = "none"
    document.getElementById("installCosmeticButton").classList.add("notActive")
    document.getElementById("installCosmeticButton").style.display = "none"
}
const cosmeticsTypeSelect = document.getElementById("cosmeticsType")
var cosmeticTypes = {}
function UpdateCosmeticsTypes() {
    fetch(`/api/cosmetics/types`).then(res => res.json().then(res => {
        cosmeticTypes = res
        if(res == null || res.fileTypes == null || res.fileTypes.length <= 0) {
            cosmeticsTypeSelect.innerHTML = `<option class="listItem" value="null">No types found</option>`;
            return;
        }
        var fvalue = cosmeticsTypeSelect.value
        var html = ""
        var htmlAvailableAfterModding = ""
        for(const value of res.fileTypes) {
            if(value.requiresModded && !isGamePatched) {
                if(htmlAvailableAfterModding == "") {
                    htmlAvailableAfterModding = `After patching the game you can add: `
                }
                htmlAvailableAfterModding += `${value.name}, `
            } else {
                if(!fvalue) {
                    fvalue = value.id
                }
                html += `<option class="listItem" value="${value.id}">${value.name} (${value.fileType})</option>`
            }
        }
        document.getElementById("availableAfterModdingTypes").style.display = htmlAvailableAfterModding != "" ? "block" : "none"
        document.getElementById("availableAfterModdingTypes").innerHTML = htmlAvailableAfterModding.substring(0, htmlAvailableAfterModding.length - 2)
        cosmeticsTypeSelect.innerHTML = html;
        if(html == "") {
            cosmeticsTypeSelect.innerHTML = `<option class="listItem" value="null">No types found</option>`;
        }
        if(!fvalue) fvalue = "null"
        cosmeticsTypeSelect.value = fvalue
        UpdateShownCosmetics()
    }))
}
UpdateCosmeticsTypes()

cosmeticsTypeSelect.onchange = () => UpdateShownCosmetics()

function UpdateShownCosmetics() {
    fetch(`/api/cosmetics/getinstalled?typeid=${cosmeticsTypeSelect.value}`).then(res => res.json().then(res => {
        var html = ``;
        if(res == null || res.length <= 0) {
            html = `<div class="listItem">None installed</div>`
        } else {
            for(const m of res) {
                html += FormatCosmetic(m)
            }
        }
        document.getElementById("cosmeticsList").innerHTML = html;
    }))
}

function FormatCosmetic(c) {
    return `
    <div class="mod" style="width: 100%;">
        <div style="display: flex; flex-direction: row; justify-content: space-between; width: 100%; margin: 20px;">
            <div>${c}</div>
            <div class="button" onclick="DeleteCosmetic('${c}')">Delete</div>
        </div>
    </div>
    `
}

function DeleteCosmetic(name) {
    fetch(`/api/cosmetics/delete?typeid=${cosmeticsTypeSelect.value}&filename=${name}`, {
        method: "DELETE"
    }).then(res => {
        UpdateShownCosmetics()
    })
}

document.getElementById("logintoken").onclick = () => {
    location = `?token=${document.getElementById("tokeninput").value}`
}

function UpdateVersion(version) {
    currentGameVersion = version
}

var isGamePatched = false
const patchingOptions = document.getElementById("patchingOptions")

function UpdatePatchingStatus() {
    if(patchInProgress) {
        return;
    }
    patchStatus.innerHTML = `Loading<br><br>${squareLoader}`
    fetch("/api/patching/getmodstatus").then(res => {
        res.json().then(res => {
            UpdateVersion(res.version)
            isGamePatched = res.isPatched
            if (res.isPatched) {
                document.getElementById("modsButton").style.display = "block"
                patchingOptions.style.display = "none"
                patchStatus.innerHTML = "<h2>Game is already patched. You can install mods</h2>"
            } else if(!res.isInstalled) {
                patchStatus.innerHTML = `<h2>Game is not installed. Please restore a backup or install the app so the game can get patched</h2>`
                patchingOptions.style.display = "none"
                document.getElementById("modsButton").style.display = "none"
            } else if(res.canBePatched) {
                patchStatus.innerHTML = `<h2>Game is not patched.</h2>
                                        <div class="button" onclick="PatchGame()">Patch it now</div>`
                patchingOptions.style.display = "block"
                document.getElementById("modsButton").style.display = "none"
            } else {
                patchStatus.innerHTML = "<h2>Game can not be modded</h2>"
                patchingOptions.style.display = "none"
                document.getElementById("modsButton").style.display = "none"
            }
            UpdateCosmeticsTypes()
            if(!IsOnQuest() && !res.isPatched && false) {
                patchStatus.innerHTML = "<h2>To mod your game open QuestAppVersionSwitcher on your Quest</h2>"
                return;
            }
        })
    })
}

setInterval(() => {
    UpdateModsAndLibs()
}, 2000);

var operationsOngoing = false
const operationsElement = document.getElementById("operations")
const ongoingCount = document.getElementById("ongoingCount")
const operationsList = document.getElementById("operationsList")

const externalStorageCheckbox = document.getElementById("externalstorage")
const handTrackingCheckbox = document.getElementById("handtracking")
const handTrackingVersion = document.getElementById("handtrackingversion")
const debugCheckbox = document.getElementById("debug")
const otherContainer = document.getElementById("other")
var otherPermissions = []

function UpdateModsAndLibs() {
    fetch(`/api/mods/mods`).then(res => {
        res.json().then(res => {
            res.operations = res.operations.filter(x => !x.isDone)
            operationsOngoing = res.operations.length > 0
            var mods = ``
            if(!operationsOngoing) {
                operationsElement.style.display = "none"
            } else {
                operationsElement.style.display = "block"
                var operations = ""
                for(const operation of res.operations){
                    operations += `
                    <div class="mod" style="padding: 10px; ${operation.type == 6 ? "color: #FF0000;" : ""}">
                        ${operation.name}
                    </div>
                    `
                }
                operationsList.innerHTML = operations
                ongoingCount.innerHTML = `Ongoing operations: ${res.operations.length}`
            }
            for(const mod of res.mods){
                mods += FormatMod(mod, !operationsOngoing)
            }
            if(mods == "") {
                mods = `<div class="mod" style="padding: 20px;">None installed</div>`
            }
            document.getElementById("modsList").innerHTML = mods
            var libs = ``
            for(const mod of res.libs){
                libs += FormatMod(mod, !operationsOngoing)
            }
            if(libs == "") {
                libs = `<div class="mod" style="padding: 20px;">None installed</div>`
            }
            document.getElementById("libsList").innerHTML = libs
        })
    })
}

function UploadMod() {
    var input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.click();
    input.onchange = () => {
        if(input.files.length > 0) {
            for(const file of input.files) {
                fetch(`/api/install?filename=${file.name}`, {
                    method: "POST",
                    body: file
                }).then(res => {
                    UpdateShownCosmetics()
                })
            }
        }
    }
}

function InstallCosmetic() {
    var input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.click();
    input.onchange = () => {
        if(input.files.length > 0) {
            for(const file of input.files) {
                // Only specify selected type if there is only one type with that extension. If the selected type is not the one with that extension, don't specify it
                var extra = `&typeid=${cosmeticsTypeSelect.value}`
                var extension = "." + file.name.split(".").pop()
                var extensionCount = 0
                var typeIsSelected = false
                for(const value of cosmeticTypes.fileTypes) {
                    if(value.fileType.toLowerCase() == extension.toLowerCase()) {
                        extensionCount++
                        if(value.id == cosmeticsTypeSelect.value)typeIsSelected = true
                    }
                }
                if(extensionCount == 1 || !typeIsSelected) extra = ""
                fetch(`/api/install?filename=${file.name}${extra}`, {
                    method: "POST",
                    body: file
                }).then(res => {
                    UpdateShownCosmetics()
                })
            }
        }
    }
}

function DeleteMod(id) {
    fetch(`/api/mods/delete?id=${id}`, {method: "POST"}).then(res => {
        UpdateModsAndLibs()
    })
}

function UpdateModState(id, enable) {
    fetch(`/api/mods/${enable ? `enable` : `uninstall`}?id=${id}`, {method: "POST"}).then(res => {
        UpdateModsAndLibs()
    })
}

function FormatMod(mod, active = true) {
    return `
    <div class="mod">
        <div class="leftRightSplit">
            <img class="modCover" src="${mod.hasCover ? `/api/mods/cover?id=${mod.Id}` : `https://raw.githubusercontent.com/ComputerElite/ComputerElite.github.io/main/assets/ModCover.png`}">
            <div class="upDownSplit spaceBetween">
                <div class="upDownSplit">
                    <div class="leftRightSplit nomargin">
                        <div>${mod.Name}</div>
                        <div class="smallText version">v${mod.VersionString}</div>
                    </div>
                    <div class="smallText">${mod.Description}</div>
                </div>
                ${active ? `
                <div class="button" onclick="DeleteMod('${mod.Id}')">Delete</div>` : ``}
            </div>
        </div>
        <div class="upDownSplit spaceBetween relative">
            <div class="smallText margin20">
                (by ${mod.Author})
            </div>
            ${active ? `
            <label class="switch">
                <input onchange="UpdateModState('${mod.Id}', ${!mod.IsInstalled})" type="checkbox" ${mod.IsInstalled ? `checked` : ``}>
                <span class="slider round"></span>
            </label>` : ``}
            
        </div>
    </div>
    `
}

function AddPermission() {
    otherPermissions.push(document.getElementById("otherName").value)
    document.getElementById("otherName").value = ""
    UpdatePermissions()
}

function UpdatePermissions() {
    var perms = ""
    for(const p of otherPermissions){
        perms += `
        <div style="padding: 10px; margin-right: 20px; border-radius: 5px; border: 1px #242424 solid;">
            ${p}
            <div class="button" style="display: inline" onclick="RemovePermission('${p}')">X</div>
        </div>`
    }
    otherContainer.innerHTML = perms
}

function RemovePermission(name) {
    otherPermissions = otherPermissions.filter(a => a != name)
    UpdatePermissions()
}

var patchInProgress = false
var lastApp = ""
function PatchGame() {
    patchInProgress = true
    var patchOptions = {
        otherPermissions: otherPermissions,
        debug: debugCheckbox.checked,
        handTracking: handTrackingCheckbox.checked,
        handTrackingVersion: parseInt(handTrackingVersion.value),
        externalStorage: externalStorageCheckbox.checked
    }
    fetch(`/api/patching/patchoptions`, {
        method: "POST",
        body: JSON.stringify(patchOptions)
    }).then(res => {
        fetch("/api/patching/patchapk", {
            method: "POST"
        }).then(res => {
            res.json().then(j => {
                if (j.success) {
                    TextBoxText("patchingTextBox", j.msg)
                    patchStatus.innerHTML = `<h2>Patching game<br><br>${squareLoader}</h2>`
                    var i = setInterval(() => {
                        fetch("/api/patching/patchstatus").then(res => {
                            res.json().then(j => {
                                if (j.done) {
                                    TextBoxGood("patchingTextBox", j.currentOperation)
                                    clearInterval(i)
                                    patchInProgress = false
                                    if(j.backupName) {
                                        if(!IsOnQuest()) {
                                            alert("Restore the backup " + j.backupName + " from within your Quest to finalize the patching process")
                                            return
                                        }
                                        // patching returned a backup name to restore so restore the backup
                                        selectedBackup = j.backupName
                                        OpenRestorePopup();
                                    }
                                    UpdateUI()
                                    
                                } else if (j.error) {
                                    TextBoxError("patchingTextBox", j.errorText)
                                    clearInterval(i)
                                    patchInProgress = false
                                    UpdateUI()
                                } else {
                                    TextBoxText("patchingTextBox", j.progressString + " - " + j.currentOperation)
                                }
                            })
                        })
                    }, 500);
                } else {
                    TextBoxError("patchingTextBox", j.msg)
                }
            })
        })
    })
}


UpdateUI()
TokenUIUpdate()
const oculusLink = "https://auth.meta.com/"
const params = new URLSearchParams(window.location.search)
var config = {}
var selectedBackup = ""

var undefinedLoader = `<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>`
setInterval(() => {
    TokenUIUpdate()
}, 5000)

function TokenUIUpdate() {
    fetch("/api/questappversionswitcher/loggedinstatus").then(res => {
        res.json().then(res => {
            if(res.msg == "2") {
                // Logged in
                document.getElementById("loggedInMsg").style.visibility = "visible"
                document.getElementById("downgradeLoginMsg").style.visibility = "hidden"
            } else {
                // Not logged in
                document.getElementById("loggedInMsg").style.visibility = "hidden"
                document.getElementById("downgradeLoginMsg").style.visibility = "visible"
            }
        })
    })
}

var firstConfigFetch = true;
function UpdateUI(closeLists = false) {
    UpdateShownCosmetics()
    fetch("/api/questappversionswitcher/config").then(res => res.json().then(res => {
        config = res
        if(firstConfigFetch) {
            firstConfigFetch = false;
            CheckFolderPermission();
        }
        Array.prototype.forEach.call(document.getElementsByClassName("packageName"), e => {
            if(config.currentApp) e.innerHTML = config.currentApp
            else e.innerHTML = "No app selected"
            if(config.currentApp != lastApp) UpdatePatchingStatus()
            lastApp = config.currentApp
        })
        if(config.currentApp) {
            fetch("/api/backups?package=" + config.currentApp).then(res => res.json().then(res => {
                document.getElementById("backupList").innerHTML = ""
                document.getElementById("size").innerHTML = res.backupsSizeString
                if (res.backups) {
                    res.backups.forEach(backup => {
                        document.getElementById("backupList").innerHTML += `<div class="listItem${backup.backupName == selectedBackup ? " listItemSelected" : ""}" value="${backup.backupName}">${backup.backupName} (${backup.backupSizeString})</div>`
                    })
                }
                if (document.getElementById("backupList").innerHTML == "") document.getElementById("backupList").innerHTML = `<div class="listItem" value="">No Backups</div>`
                Array.prototype.forEach.call(document.getElementsByClassName("listItem"), i => {
                    i.onclick = function () {
                        selectedBackup = i.getAttribute("value")
                        UpdateUI()
                    }
                })
            }))
        } else {
            document.getElementById("backupList").innerHTML = `<div class="listItem" value="">Select an app via the change app button above</div>`
        }
    }))
    fetch("/api/allbackups").then(res => {
        res.json().then(j => {
            Array.prototype.forEach.call(document.getElementsByClassName("totalSize"), i => {
                i.innerHTML = j.msg
            })
        })
    })
    fetch("/api/questappversionswitcher/about").then(res => res.json().then(res => {
        document.getElementById("version").innerHTML = res.version
        document.getElementById("ips").innerHTML = ""
        res.browserIPs.forEach(i => {
            document.getElementById("ips").innerHTML += i + "<br>"
        })
    }))
    Array.prototype.forEach.call(document.getElementsByClassName("selectedBackupName"), i => {
        i.innerHTML = selectedBackup
    })
    if (closeLists) {
        document.getElementById("appList").className = "list hidden"
        document.getElementById("appListContainer").className = "listContainer hidden"
        document.getElementById("appList").innerHTML = ""
    }
    UpdatePatchingStatus()
}

if(params.get("token")) {
    OpenTokenPasswordPopup()
}

if(params.get("restart")) {
    OpenGetPasswordPopup()
    GotoStep(10)
}

if(params.get("loadoculus")) {
    location = oculusLink
}

document.getElementById("login").onclick = () => {
    OpenGetPasswordPopup()
    GotoStep(9)
}

setInterval(() => {
    UpdateUI()
}, 10000)

setInterval(() => {
    fetch("/api/downloads").then(res => {
        var m = ""
        var gdms = ""
        res.json().then(json => {
            for(const d of json.individualDownloads) {
                m += `<div class="downloadContainer">
                    <div class="downloadProgressContainer">
                        <div class="downloadProgressBar" style="width: ${d.percentage * 100}%;"></div>
                    </div>
                    ${d.isCancelable ? `<input type="button" class="DownloadText" value="Cancel" onclick="StopDownload('${d.backupName}')">` : ``}
                    <div class="DownloadText" style="color: ${d.textColor};">
                        ${d.text} ${d.percentageString} ${d.doneString} / ${d.totalString} ${d.speedString} ETA ${d.eTAString}
                    </div>
                </div>`
            }
            for(const d of json.gameDownloads) {
                gdms += `<div class="downloadContainer">
                    <div class="downloadProgressContainer">
                        <div class="downloadProgressBar" style="width: ${d.progress * 100}%;"></div>
                    </div>
                     ${!d.done ? `<input type="button" class="DownloadText" value="Cancel" onclick="StopGameDownload('${d.id}')">` : ``}
                    <div class="DownloadText" style="color: ${d.textColor};">
                        ${d.canceled ? "Canceled " : ""}${d.status}<br>${d.filesDownloaded} / ${d.filesToDownload} files downloaded
                    </div>
                </div>`
            }
            if (m == "") m = "<h2>No downloads running</h2>"
            if (gdms == "") gdms = "<h2>No game downloads running</h2>"
            document.getElementById("progressBarContainers").innerHTML = m
            document.getElementById("gameProgressBarContainers").innerHTML = gdms
        })
    })
}, 500)

function StopGameDownload(id) {
    fetch("/api/cancelgamedownload?id=" + id, {method: "POST"})
}

function ShowAppList() {
    document.getElementById("appList").innerHTML = undefinedLoader
    document.getElementById("appList").className = "list"
    document.getElementById("appListContainer").className = "listContainer"
    fetch("hiddenApps.json").then(res => res.json().then(hiddenApps => {
        hiddenApps = hiddenApps.map(x => x.PackageName)
        fetch("/api/android/installedappsandbackups").then(res => res.json().then(res => {
            document.getElementById("appList").innerHTML = ""
            res.sort((a, b) => a.PackageName.localeCompare(b.PackageName))
            const interval = 10
            var target = 0
            var current = 0
            var i = setInterval(() => {
                target = res.length < target + interval ? res.length : target + interval
                var apps = ""
                while (current < target) {
                    var app = res[current]
                    if(hiddenApps.includes(app.PackageName)) {
                        current++
                        continue;
                    }
                    //apps += `<div onclick="ChangeApp('${app.PackageName}')" class="listItem${app.PackageName == config.currentApp ? " listItemSelected" : ""}" value="${app.PackageName}">${app.AppName} - ${app.PackageName}</div>`
                    apps += `<div onclick="ChangeApp('${app.PackageName}')" class="listItem${app.PackageName == config.currentApp ? " listItemSelected" : ""}" value="${app.PackageName}">${app.PackageName}</div>`
                    current++
                }
                document.getElementById("appList").innerHTML += apps
                if (current == res.length) clearInterval(i)
            }, 200)
        }))
    }))
    
}

function ChangeApp(package) {
    console.log("Changing app to " + package)
    config.currentApp = package
    fetch("/api/questappversionswitcher/changeapp", {
        method: "POST",
        body: package
    }).then(() => UpdateUI(true))
    UpdateUI(true)
    UpdateCosmeticsTypes()
    CheckFolderPermission()
}

document.getElementById("exit").onclick = () => {
    fetch("/api/questappversionswitcher/kill", {method: "POST"})
}
document.getElementById("closeApp").onclick = () => {
    fetch("/api/questappversionswitcher/kill", {method: "POST"})
}
document.getElementById("confirmPort").onclick = () => {
    var port = parseInt(document.getElementById("port").value)
    if(port < 5000 || port > 6000) {
        TextBoxError("serverTextBox", "Only ports between 5000 and 6000 are allowed")
        return
    }
    fetch("/api/questappversionswitcher/changeport", {
        method: "POST",
        body: document.getElementById("port").value
    }).then(res => {
        res.json().then(j => {
            if(res.status == 200) {
                TextBoxGood("serverTextBox", j.msg)
            } else {
                TextBoxError("serverTextBox", j.msg)
            }
        })
    })
}

document.getElementById("appListContainer").onclick = (event) => {
    if (event.target.id == 'appListContainer') UpdateUI(true)
}
setInterval(() => {
    Array.prototype.forEach.call(document.getElementsByClassName("menuItem"), i => {
        i.onclick = function () {
            Array.prototype.forEach.call(document.getElementsByClassName("menuItem"), e => {
                e.className = "menuItem" + (e.getAttribute("section") == this.getAttribute("section") ? " selected" : "")
            })
            Array.prototype.forEach.call(document.getElementsByClassName("contentItem"), e => {
                e.className = "contentItem" + (e.id == this.getAttribute("section") ? "" : " hidden")
            })
        }
    })
}, 500)


var backupInProgress = false

document.getElementById("createBackup").onclick = () => {
    if (!config.currentApp) {
        TextBoxError("backupTextBox", "Please select an app first via the change app button above")
        return
    }
    if (backupInProgress) {
        TextBoxError("backupTextBox", "A Backup is being created right now. Please wait until it has finished")
        return
    }
    var onlyAppData = document.getElementById("appdata").checked
    backupInProgress = true
    TextBoxText("backupTextBox", "Please wait while the Backup is being created. This can take a few minutes")
    fetch("/api/backup?package=" + config.currentApp + "&backupname=" + document.getElementById("backupname").value + (onlyAppData ? "&onlyappdata=true" : ""), {
        method: "POST"
    }).then(res => {
        res.json().then(j => {
            if (res.status == 202) {
                TextBoxText("backupTextBox", j.msg)
                var i = setInterval(() => {
                    fetch("/api/backupstatus").then(res => {
                        res.json().then(j => {
                            if (j.done) {
                                TextBoxGood("backupTextBox", j.currentOperation)
                                clearInterval(i)
                                backupInProgress = false
                                UpdateUI()
                            } else if (j.error) {
                                TextBoxError("backupTextBox", j.errorText)
                                clearInterval(i)
                                backupInProgress = false
                                UpdateUI()
                            } else {
                                TextBoxText("backupTextBox", j.progressString + " - " + j.currentOperation)
                            }
                        })
                    })
                }, 500);
            } else {
                TextBoxError("backupTextBox", j.msg)
                backupInProgress = false
            }
            UpdateUI()
        })


    })
}

document.getElementById("changeApp").onclick = () => ShowAppList()
document.getElementById("changeApp2").onclick = () => ShowAppList()
document.getElementById("changeApp3").onclick = () => ShowAppList()

document.getElementById("abort").onclick = () => CloseRestorePopup()

document.getElementById("abort2").onclick = () => CloseRestorePopup()

function CloseRestorePopup() {
    document.getElementById("restoreContainer").className = "listContainer darken hidden"
    HideTextBox("step1box")
    HideTextBox("step3box")
    HideTextBox("step4box")
    GotoStep(1)
}

function OpenRestorePopup() {
    CloseRestorePopup()
    document.getElementById("restoreContainer").className = "listContainer darken"
}

document.getElementById("uninstall").onclick = () => {
    if(!IsOnQuest()) return
    fetch(`/api/android/uninstallpackage?package=${config.currentApp}`, {method: "POST"}).then(res => {
        if (res.status == 230) GotoStep(3)
        else GotoStep(2)
    })
}

document.getElementById("uninstall2").onclick = () => {
    fetch(`/api/backupinfo?package=${config.currentApp}&backupname=${selectedBackup}`).then(res => {
        res.json().then(j => {
            if(!j.containsApk) {
                GotoStep("4.1")
            } else {
                fetch(`/api/android/uninstallpackage?package=${config.currentApp}`, {method: "POST"}).then(res => {
                    if (res.status == 230) GotoStep(3)
                    else GotoStep(2)
                })
            }
        })
    })
    
}

document.getElementById("confirm1").onclick = () => {
    fetch("/api/android/ispackageinstalled?package=" + config.currentApp).then(res => {
        res.json().then(j => {
            if (!j.isAppInstalled) GotoStep(3)
            else {
                TextBoxError("step1box", config.currentApp + " is still installed. Please uninstall it.")
                GotoStep(1)
            }
        })
    })
}

document.getElementById("install").onclick = () => {
    fetch("/api/restoreapp?package=" + config.currentApp + "&backupname=" + selectedBackup, {
        method: "POST"
    }).then(res => {
        res.json().then(j => {
            if (res.status == 200) {
                fetch("/api/gotaccess?package=" + config.currentApp).then(res => {
                    res.json().then(j => {
                        if (j.gotAccess) {
                            fetch("/api/backupinfo?package=" + config.currentApp + "&backupname=" + selectedBackup).then(res => {
                                res.json().then(j => {
                                    if(j.isPatchedApk) {
                                        GotoStep("4.2")
                                    } else {
                                        if (j.containsAppData) {
                                            GotoStep(4)
                                        } else {
                                            GotoStep(5)
                                        }
                                    }
                                })
                            })
                        } else {
                            GotoStep("4.1")
                        }
                    })
                })
            }
            else TextBoxError("step4.1box", j.msg)
        })
    })
}

document.getElementById("grantManageAccess").onclick = () => {
    fetch("/api/android/ispackageinstalled?package=" + config.currentApp).then(res => {
        res.json().then(j => {
            if (j.isAppInstalled) {
                fetch("/api/grantmanagestorageappaccess?package=" + config.currentApp, {method: "POST"}).then(res => {
                    res.json().then(j => {
                        if (j.success) {
                            fetch("/api/backupinfo?package=" + config.currentApp + "&backupname=" + selectedBackup).then(res => {
                                res.json().then(j => {
                                    if (j.containsAppData) {
                                        GotoStep(4)
                                    } else {
                                        GotoStep(5)
                                    }
                                })
                            })
                        } else TextBoxError("step3box", j.msg)
                    })
                })
            }
            else {
                TextBoxError("step3box", config.currentApp + " is not installed. Please try again. Disable library sharing and remove all account from your quest except your primary one.")
                GotoStep(3)
            }
        })
    })
}

document.getElementById("grantAccess").onclick = () => {
    fetch("/api/android/ispackageinstalled?package=" + config.currentApp).then(res => {
        res.json().then(j => {
            if (j.isAppInstalled) {
                fetch("/api/grantaccess?package=" + config.currentApp, {method: "POST"}).then(res => {
                    res.json().then(j => {
                        if (j.success) {
                            fetch("/api/backupinfo?package=" + config.currentApp + "&backupname=" + selectedBackup).then(res => {
                                res.json().then(j => {
                                    if(j.isPatchedApk) {
                                        GotoStep("4.2")
                                    } else {
                                        if (j.containsAppData) {
                                            GotoStep(4)
                                        } else {
                                            GotoStep(5)
                                        }
                                    }
                                })
                            })
                        } else TextBoxError("step3box", j.msg)
                    })
                })
            }
            else {
                TextBoxError("step3box", config.currentApp + " is not installed. Please try again. Disable library sharing and remove all account from your quest except your primary one.")
                GotoStep(3)
            }
        })
    })
}

document.getElementById("deleteAllMods").onclick = () => {
    TextBoxText("updateTextBox", "Deleting all mods...")
    fetch("/api/mods/deleteallmods", {
        method: "POST"
    }).then(res => {
        res.json().then(j => {
            if(j.success) {
                TextBoxGood("updateTextBox", j.msg)
            } else {
                TextBoxError("updateTextBox", j.msg)
            }
        })
    });
}

document.getElementById("grantAccess2").onclick = () => {
    fetch("/api/grantaccess?package=" + config.currentApp, {method: "POST"}).then(res => {
        CloseRestorePopup();
    })
}

document.getElementById("requestManageStorageAppPermission").onclick = () => {
    fetch("/api/grantmanagestorageappaccess?package=" + config.currentApp, {method: "POST"}).then(res => {
    })
}

document.getElementById("requestAppPermission").onclick = () => {
    fetch("/api/grantaccess?package=" + config.currentApp, {method: "POST"})
}

document.getElementById("restoreappdata").onclick = () => {
    fetch("/api/android/ispackageinstalled?package=" + config.currentApp).then(res => {
        res.json().then(j => {
            if (j.isAppInstalled) {
                TextBoxText("step4box", "Restoring game data. Please wait")
                fetch("/api/restoregamedata?package=" + config.currentApp + "&backupname=" + selectedBackup, {method: "POST"}).then(res => {
                    res.json().then(j => {
                        if (j.success) GotoStep(6)
                        else {
                            TextBoxError("step4box", j.msg)
                        }
                    })
                }).catch(err => {
                    GotoStep(6)
                })
            }
            else {
                TextBoxError("step3box", config.currentApp + " is not installed. Please try again. Disable library sharing and remove all account from your quest except your primary one.")
                GotoStep(3)
            }
        })
    })
}

document.getElementById("skip").onclick = () => {
    fetch("/api/android/ispackageinstalled?package=" + config.currentApp).then(res => {
        res.json().then(j => {
            if (j.isAppInstalled) GotoStep(6)
            else {
                TextBoxError("step3box", config.currentApp + " is not installed. Please try again. Disable library sharing and remove all account from your quest except your primary one.")
                GotoStep(3)
            }
        })
    })
}

document.getElementById("skip2").onclick = () => {
    TextBoxText("step3box", "checking... please wait")
    fetch("/api/android/ispackageinstalled?package=" + config.currentApp).then(res => {
        res.json().then(j => {
            if (j.isAppInstalled) GotoStep(6)
            else {
                TextBoxError("step3box", config.currentApp + " is not installed. Please install it.")
                GotoStep(3)
            }
        })
    })
}

document.getElementById("restoreBackup").onclick = () => {
    if(!IsOnQuest()) {
        TextBoxError("restoreTextBox", "You can only restore backups in your quest")
        return
    }
    if (backupInProgress) {
        TextBoxError("restoreTextBox", "Can not restore a backup while one is being created")
        return
    }
    if (selectedBackup == "") {
        TextBoxError("restoreTextBox", "You have to select a Backup from the list above")
        return
    }
    OpenRestorePopup()
    if(document.getElementById("restoreAppData").checked) GotoStep("4.1")
}

function GotoStep(step) {
    Array.prototype.forEach.call(document.getElementsByClassName("restoreStep"), e => {
        e.className = `restoreStep${e.id == "step" + step ? "" : " hidden"}`
    })
}

function CloseDeletePopup() {
    document.getElementById("deleteContainer").className = "listContainer darken hidden"
    GotoStep(6)
}
document.getElementById("deleteBackup").onclick = () => OpenDeletePopup();
function OpenDeletePopup() {
    CloseDeletePopup()
    document.getElementById("deleteContainer").className = "listContainer darken"
}

function CloseTokenPasswordPopup(done = false) {
    document.getElementById("getPasswordContainer").className = "listContainer darken hidden"
    GotoStep(8)
    if (!done) CloseTokenPasswordPopup(true)
}

function OpenTokenPasswordPopup() {
    CloseTokenPasswordPopup()
    document.getElementById("getPasswordContainer").className = "listContainer darken"
}

function CloseGetPasswordPopup() {
    document.getElementById("getPasswordContainer").className = "listContainer darken hidden"
    HideTextBox("step7box")
    GotoStep(7)
}

CheckUpdate()

document.getElementById("checkUpdate").onclick = () => CheckUpdate()
var updateAvailable = false
function CheckUpdate() {
    TextBoxText("updateTextBox", "Checking for updates...")
    fetch("/api/questappversionswitcher/checkupdate").then(res => res.json().then(json => {
        if(json.isUpdateAvailable) {
            updatePromptOpen = true
            CloseRestorePopup()
            OpenGetPasswordPopup()
            GotoStep(11)
            document.getElementById("updateAvailableText").innerHTML = json.msg + "<br><br>" + json.changelog.replace(/\n/g, "<br>")
        } else {
            TextBoxText("updateTextBox", json.msg)
        }
    }))
}

document.getElementById("cancelupdate").onclick = () => {
    CloseGetPasswordPopup()
    updateAvailable = false;
    CheckFolderPermission()
}

document.getElementById("updateqavs").onclick = () => {
    fetch("/api/questappversionswitcher/update", {method: "POST"}).then(res => res.json().then(j => {
        TextBoxText("step11box", j.msg)
    }))
}

function OpenGetPasswordPopup() {
    CloseGetPasswordPopup()
    document.getElementById("getPasswordContainer").className = "listContainer darken"
}
var options = {}
window.onmessage = (e) => {
    options = JSON.parse(e.data)
    OpenGetPasswordPopup()
}
document.getElementById("abortPassword").onclick = () => {
    document.getElementById("abortPassword").innerHTML = "Abort Download"
    document.getElementById("confirmPassword").style.display = "block"
    CloseGetPasswordPopup()
}
document.getElementById("confirmPassword").onclick = () => {
    TextBoxText("step7box", "Waiting for response and requesting obbs to download from Oculus...")
    options.password = encodeURIComponent(document.getElementById("passwordConfirm").value)
    options.app = options.parentName
    fetch("/api/download", {
        method: "POST",
        body: JSON.stringify(options)
    }).then(res => {
        res.json().then(j => {
            if (!j.success) {
                TextBoxError("step7box", j.msg)
            } else {
                TextBoxGood("step7box", j.msg)
                document.getElementById("abortPassword").innerHTML = "Close Popup"
                document.getElementById("confirmPassword").style.display = "none"
            }
        })
    })
}

function StopDownload(name) {
    fetch(`/api/canceldownload?name=${name}`, {method: "POST"})
}

document.getElementById("logs").onclick = () => {
    TextBoxText("logsText", "Collecting information.. please allow us up to 30 seconds to collect everything")
    fetch("/api/questappversionswitcher/uploadlogs", {
        method: "POST",
        body: encodeURIComponent(document.getElementById("logspwd").value)
    }).then(res => {
        res.text().then(text => {
            if (res.status == 403) {
                TextBoxError("logsText", text)
            } else if (res.status == 200) {
                fetch("https://oculusdb.rui2015.me/api/v1/qavsreport", {method: "POST", body: text}).then(res => {
                    res.text().then(text => {
                        TextBoxGood("logsText", "Logs uploaded successfully. Tell your support member this ID: " + text)
                    })
                })
            }
        })
    })
}

document.getElementById("abortLogin").onclick = () => {
    CloseGetPasswordPopup()
}
document.getElementById("confirmLogin").onclick = () => {
    TextBoxGood("step9box", "One sec...")
    location = oculusLink
}

document.getElementById("tokenPassword").onclick = () => {
    options.password = encodeURIComponent(document.getElementById("passwordConfirm").value)
    options.app = options.parentName
    fetch("/api/token", {
        method: "POST",
        body: JSON.stringify({
            token: params.get("token"),
            password: encodeURIComponent(document.getElementById("passwordToken").value)
        })
    }).then(res => {
        res.json().then(j => {
            if (j.success) {
                TextBoxGood("step8box", j.msg)
                setTimeout(() => {
                    TokenUIUpdate()
                    CloseGetPasswordPopup()
                }, 5000)
            } else {
                TextBoxError("step8box", j.msg + "<br>The pop up will close automatically in 10 seconds")
                setTimeout(() => {
                    CloseGetPasswordPopup()
                }, 10000)
            }
        })
    })
}

document.getElementById("delete").onclick = () => {
    CloseDeletePopup()
    TextBoxText("restoreTextBox", "Deleting Backup. Please wait.")
    fetch("/api/backup?package=" + config.currentApp + "&backupname=" + selectedBackup, {
        method: "DELETE"
    }).then(res => {
        res.json().then(j => {
            if (j.success) {
                TextBoxGood("restoreTextBox", j.msg)
                UpdateUI()
            } else {
                TextBoxError("restoreTextBox", j.msg)
                UpdateUI()
            }
        })
    })
}

document.getElementById("abortDelete").onclick = () => {
    CloseDeletePopup()
}



function TextBoxError(id, text) {
    ChangeTextBoxProperty(id, "#EE0000", text)
}

function TextBoxText(id, text) {
    ChangeTextBoxProperty(id, "#03cffc", text)
}

function TextBoxGood(id, text) {
    ChangeTextBoxProperty(id, "#00EE00", text)
}

function HideTextBox(id) {
    document.getElementById(id).style.visibility = "hidden"
}

function ChangeTextBoxProperty(id, color, innerHtml) {
    var text = document.getElementById(id)
    text.style.visibility = "visible"
    text.style.border = color + " 1px solid"
    text.innerHTML = innerHtml
}