﻿using System;
using System.Collections.Generic;
using ComputerUtils.Android.VarUtils;
using QuestAppVersionSwitcher.ClientModels;
using QuestAppVersionSwitcher.Mods;

namespace QuestAppVersionSwitcher
{

    public class QAVSReport
    {
        public int androidVersion { get; set; }
        public string log { get; set; }
        public string version { get; set; }
        public DateTime reportTime { get; set; }
        public string reportId { get; set; }
        public bool userIsLoggedIn { get; set; }
        public List<string> userEntitlements { get; set; } = new List<string>();
        public long availableSpace { get; set; }
        public PatchingStatus appStatus { get; set; }
        public string availableSpaceString
        {
            get
            {
                return SizeConverter.ByteSizeToString(availableSpace);
            }
        }
        public ModsAndLibs modsAndLibs { get; set; } = null;
    }
}