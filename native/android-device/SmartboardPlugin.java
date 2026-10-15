package org.kopynotes.app;

import android.app.ActivityManager;
import android.content.ComponentCallbacks2;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="Smartboard")
public class SmartboardPlugin extends Plugin {
 private boolean awake=false, immersive=false, foreground=true, callbacksRegistered=false;
 private final ComponentCallbacks2 memoryCallbacks=new ComponentCallbacks2(){
  @Override public void onConfigurationChanged(Configuration configuration) {}
  @Override public void onLowMemory(){emitMemoryPressure("critical",80);}
  @Override public void onTrimMemory(int level){
   // UI_HIDDEN reports visibility, not memory pressure. Android 14+ no longer
   // sends the RUNNING_* levels, so foreground memory checks remain necessary.
   if(level==ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN){emitAppState(false);return;}
   if(level>=80 || level==15)emitMemoryPressure("critical",level);
   else if(level>=5)emitMemoryPressure("moderate",level);
  }
 };
 @Override public void load(){
  getContext().getApplicationContext().registerComponentCallbacks(memoryCallbacks);
  callbacksRegistered=true;
 }
 private ActivityManager manager(){return (ActivityManager)getContext().getSystemService(Context.ACTIVITY_SERVICE);}
 private ActivityManager.MemoryInfo memoryInfo(){
  ActivityManager.MemoryInfo info=new ActivityManager.MemoryInfo();
  ActivityManager activityManager=manager();if(activityManager!=null)activityManager.getMemoryInfo(info);
  return info;
 }
 private void emitMemoryPressure(String severity,int level){
  JSObject event=new JSObject();event.put("severity",severity);event.put("level",level);
  notifyListeners("memoryPressure",event,true);
 }
 private void emitAppState(boolean active){
  JSObject event=new JSObject();event.put("active",active);notifyListeners("appState",event,true);
 }
 @PluginMethod public void environment(PluginCall call){
  ActivityManager activityManager=manager();ActivityManager.MemoryInfo memory=memoryInfo();
  JSObject result=new JSObject();
  result.put("largeScreen",getContext().getResources().getConfiguration().smallestScreenWidthDp>=600);
  result.put("totalMemoryMB",memory.totalMem/(1024L*1024L));
  result.put("availableMemoryMB",memory.availMem/(1024L*1024L));
  result.put("lowMemory",memory.lowMemory);
  result.put("lowRamDevice",activityManager!=null && activityManager.isLowRamDevice());
  result.put("memoryClassMB",activityManager==null?0:activityManager.getMemoryClass());
  call.resolve(result);
 }
 @PluginMethod public void configure(PluginCall call){
  String orientation=call.getString("orientation","system");awake=call.getBoolean("keepAwake",false);immersive=call.getBoolean("fullscreen",false);
  getActivity().runOnUiThread(()->{try{
   getActivity().setRequestedOrientation("landscape".equals(orientation)?ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE:"portrait".equals(orientation)?ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT:ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
   apply();call.resolve();}catch(Exception error){call.reject("Could not apply display preferences",error);}});
 }
 private void apply(){
  if(awake && foreground)getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
  if(!foreground)return;
  WindowInsetsControllerCompat controller=WindowCompat.getInsetsController(getActivity().getWindow(),getActivity().getWindow().getDecorView());
  controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
  if(immersive)controller.hide(WindowInsetsCompat.Type.systemBars());else controller.show(WindowInsetsCompat.Type.systemBars());
 }
 @Override protected void handleOnPause(){
  foreground=false;getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);emitAppState(false);
 }
 @Override protected void handleOnResume(){
  foreground=true;getActivity().runOnUiThread(this::apply);emitAppState(true);
  if(memoryInfo().lowMemory)emitMemoryPressure("critical",15);
 }
 @Override protected void handleOnDestroy(){
  if(callbacksRegistered){getContext().getApplicationContext().unregisterComponentCallbacks(memoryCallbacks);callbacksRegistered=false;}
  getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
 }
}
