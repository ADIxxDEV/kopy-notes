package org.kopynotes.app;
import android.app.Activity;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.media.projection.MediaProjectionConfig;
import android.os.Build;
import android.os.Bundle;

/** One screenshot request, with fresh Android consent; no background recording. */
public class AnnotationCaptureActivity extends Activity {
 @Override protected void onCreate(Bundle savedInstanceState){super.onCreate(savedInstanceState);if(!DisplayAnnotationService.active()){finish();return;}if(savedInstanceState!=null)return;
  MediaProjectionManager manager=(MediaProjectionManager)getSystemService(MEDIA_PROJECTION_SERVICE);
  try{Intent request=Build.VERSION.SDK_INT>=34?manager.createScreenCaptureIntent(MediaProjectionConfig.createConfigForDefaultDisplay()):manager.createScreenCaptureIntent();startActivityForResult(request,91);}catch(Exception error){DisplayAnnotationService.captureCancelled("Screen capture is unavailable on this device.");finish();}
 }
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request!=91)return;if(!DisplayAnnotationService.active()){finish();return;}if(result==RESULT_OK&&data!=null){Intent service=new Intent(this,DisplayAnnotationService.class).setAction("capture").putExtra("resultCode",result).putExtra("resultData",data);if(Build.VERSION.SDK_INT>=26)startForegroundService(service);else startService(service);}else DisplayAnnotationService.captureCancelled("Screenshot cancelled.");finish();}
}
