const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

const MODULE_DIR = ['app', 'src', 'main', 'java', 'com', 'danghieu', 'trackcam'];
const MODULE_FILE = 'TrackDeviceBatteryOptimizationModule.java';
const PACKAGE_FILE = 'TrackDeviceBatteryOptimizationPackage.java';

function writeFileIfChanged(filePath, content) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === content) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function patchMainApplication(androidProjectRoot) {
  const candidates = [
    path.join(androidProjectRoot, 'app', 'src', 'main', 'java', 'com', 'danghieu', 'trackcam', 'MainApplication.kt'),
    path.join(androidProjectRoot, 'app', 'src', 'main', 'java', 'com', 'danghieu', 'trackcam', 'MainApplication.java'),
  ];
  const mainApplicationPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!mainApplicationPath) {
    return;
  }

  let source = fs.readFileSync(mainApplicationPath, 'utf8');
  if (source.includes('TrackDeviceBatteryOptimizationPackage')) {
    return;
  }

  if (mainApplicationPath.endsWith('.kt')) {
    source = source.replace(
      /val packages = PackageList\(this\)\.packages/,
      'val packages = PackageList(this).packages\n          packages.add(TrackDeviceBatteryOptimizationPackage())'
    );
  } else {
    source = source.replace(
      /List<ReactPackage> packages = new PackageList\(this\)\.getPackages\(\);/,
      'List<ReactPackage> packages = new PackageList(this).getPackages();\n          packages.add(new TrackDeviceBatteryOptimizationPackage());'
    );
  }

  fs.writeFileSync(mainApplicationPath, source);
}

module.exports = function withTrackDeviceBatteryOptimization(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidProjectRoot = config.modRequest.platformProjectRoot;
      const moduleRoot = path.join(androidProjectRoot, ...MODULE_DIR);

      writeFileIfChanged(
        path.join(moduleRoot, MODULE_FILE),
        `package com.danghieu.trackcam;

import android.content.Context;
import android.os.PowerManager;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class TrackDeviceBatteryOptimizationModule extends ReactContextBaseJavaModule {
  public TrackDeviceBatteryOptimizationModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "TrackDeviceBatteryOptimization";
  }

  @ReactMethod
  public void isIgnoringBatteryOptimizations(Promise promise) {
    try {
      ReactApplicationContext context = getReactApplicationContext();
      PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);

      if (powerManager == null) {
        promise.reject("power_manager_unavailable", "PowerManager is unavailable.");
        return;
      }

      boolean isIgnoring = powerManager.isIgnoringBatteryOptimizations(context.getPackageName());
      promise.resolve(isIgnoring);
    } catch (Exception error) {
      promise.reject("battery_optimization_check_failed", error);
    }
  }
}
`
      );

      writeFileIfChanged(
        path.join(moduleRoot, PACKAGE_FILE),
        `package com.danghieu.trackcam;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class TrackDeviceBatteryOptimizationPackage implements ReactPackage {
  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new TrackDeviceBatteryOptimizationModule(reactContext));
    return modules;
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }
}
`
      );

      patchMainApplication(androidProjectRoot);
      return config;
    },
  ]);
};
