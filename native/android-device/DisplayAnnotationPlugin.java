package org.kopynotes.app;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;

@CapacitorPlugin(name="DisplayAnnotation")
public class DisplayAnnotationPlugin extends Plugin {
 private boolean launching;
 private android.content.SharedPreferences preferences(){return getContext().getSharedPreferences("kopy-display",0);}
 @PluginMethod public void start(PluginCall call){
  if(launching){call.reject("Display annotation setup is already open.");return;}launching=true;String route=call.getString("route","");if(route.matches("^#/board/[a-zA-Z0-9_-]+$"))preferences().edit().putString("route",route).apply();
  if(!Settings.canDrawOverlays(getContext())){
   try{Intent permission=new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getContext().getPackageName()));startActivityForResult(call,permission,"overlayPermissionReturned");}catch(Exception error){launching=false;call.reject("Open Android settings and allow Display over other apps for Kopy Notes.",error);}return;
  }launch(call);
 }
 @ActivityCallback private void overlayPermissionReturned(PluginCall call,ActivityResult ignored){if(call==null)return;if(!Settings.canDrawOverlays(getContext())){launching=false;call.reject("Display over other apps permission was not enabled. Your lesson is still open.");return;}launch(call);}
 private void launch(PluginCall call){getActivity().runOnUiThread(()->{
  try{Intent intent=new Intent(getContext(),DisplayAnnotationService.class);intent.setAction("start");if(Build.VERSION.SDK_INT>=26)getContext().startForegroundService(intent);else getContext().startService(intent);
   // Wait for the service to attach its windows before moving the classroom behind other apps.
   Handler handler=new Handler(Looper.getMainLooper());long deadline=android.os.SystemClock.uptimeMillis()+4000;
   handler.post(new Runnable(){public void run(){if(DisplayAnnotationService.active()){JSObject result=new JSObject();result.put("active",true);getActivity().moveTaskToBack(true);launching=false;call.resolve(result);}else if(android.os.SystemClock.uptimeMillis()<deadline)handler.postDelayed(this,80);else {launching=false;call.reject("Android could not open the annotation overlay. Check Display over other apps permission.");}}});
  }catch(Exception error){launching=false;call.reject("Could not start display annotation: "+error.getMessage(),error);}
 });}
 @PluginMethod public void status(PluginCall call){JSObject result=new JSObject();result.put("supported",true);result.put("active",DisplayAnnotationService.active());result.put("permission",Settings.canDrawOverlays(getContext()));if(preferences().getBoolean("returnPending",false)){result.put("route",preferences().getString("route",""));preferences().edit().putBoolean("returnPending",false).apply();}call.resolve(result);}
 @PluginMethod public void stop(PluginCall call){getContext().stopService(new Intent(getContext(),DisplayAnnotationService.class));call.resolve();}
 @Override protected void handleOnResume(){if(!launching&&DisplayAnnotationService.active()){preferences().edit().putBoolean("returnPending",true).apply();getContext().stopService(new Intent(getContext(),DisplayAnnotationService.class));}if(preferences().getBoolean("returnPending",false)){JSObject result=new JSObject();result.put("route",preferences().getString("route",""));preferences().edit().putBoolean("returnPending",false).apply();notifyListeners("returned",result,true);}}
}
