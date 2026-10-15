package org.kopynotes.app;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import androidx.activity.result.ActivityResult;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

@CapacitorPlugin(name="DeviceLibrary")
public class DeviceLibraryPlugin extends Plugin {
 private final ExecutorService executor=Executors.newSingleThreadExecutor();
 private static final int LIMIT=160*1024*1024;
 private android.content.SharedPreferences prefs(){return getContext().getSharedPreferences("kopy-device-folder",0);}
 private Uri root() throws Exception {String value=prefs().getString("tree",null);if(value==null)throw new IOException("Choose a device folder first.");return Uri.parse(value);}
 private Uri document(Uri tree,String id){return DocumentsContract.buildDocumentUriUsingTree(tree,id);}
 private static class Copy {String id,name;long time;Copy(String id,String name,long time){this.id=id;this.name=name;this.time=time;}}
 private List<Copy> files(Uri tree) throws Exception {
  List<Copy> copies=new ArrayList<>();Uri children=DocumentsContract.buildChildDocumentsUriUsingTree(tree,DocumentsContract.getTreeDocumentId(tree));
  try(Cursor cursor=getContext().getContentResolver().query(children,new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID,DocumentsContract.Document.COLUMN_DISPLAY_NAME},null,null,null)){
   if(cursor==null)throw new IOException("Folder permission unavailable. Choose the folder again.");
   while(cursor.moveToNext()){String name=cursor.getString(1);if(name.matches("library-\\d+-[a-f0-9]{8}\\.kopybackup"))copies.add(new Copy(cursor.getString(0),name,Long.parseLong(name.split("-")[1])));}
  }copies.sort((a,b)->Long.compare(b.time,a.time));return copies;
 }
 private String folderName(Uri tree){try(Cursor cursor=getContext().getContentResolver().query(document(tree,DocumentsContract.getTreeDocumentId(tree)),new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME},null,null,null)){if(cursor!=null&&cursor.moveToFirst())return cursor.getString(0);}catch(Exception ignored){}return "Chosen device folder";}
 private JSObject state() throws Exception {JSObject value=new JSObject();value.put("available",true);String selected=prefs().getString("tree",null);if(selected==null){value.put("folder",JSONObject.NULL);return value;}Uri tree=root();List<Copy> copies=files(tree);value.put("folder",folderName(tree));value.put("savedAt",copies.isEmpty()?JSONObject.NULL:copies.get(0).time);return value;}
 @PluginMethod public void status(PluginCall call){executor.execute(()->{try{call.resolve(state());}catch(Exception e){call.reject("Folder permission unavailable. Choose the device folder again.",e);}});}
 @PluginMethod public void choose(PluginCall call){Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION|Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);startActivityForResult(call,intent,"folderChosen");}
 @ActivityCallback private void folderChosen(PluginCall call,ActivityResult result){if(call==null)return;if(result.getResultCode()!=Activity.RESULT_OK||result.getData()==null){status(call);return;}try{Uri tree=result.getData().getData();if(tree==null)throw new IOException("No folder selected.");int flags=result.getData().getFlags()&(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);if((flags&Intent.FLAG_GRANT_WRITE_URI_PERMISSION)==0)throw new IOException("Grant write access to save your lessons.");getContext().getContentResolver().takePersistableUriPermission(tree,flags);prefs().edit().putString("tree",tree.toString()).apply();status(call);}catch(Exception e){call.reject(e.getMessage(),e);}}
 private String readText(Uri file) throws Exception {try(InputStream stream=getContext().getContentResolver().openInputStream(file);ByteArrayOutputStream output=new ByteArrayOutputStream()){if(stream==null)throw new IOException("Copy unavailable.");byte[] buffer=new byte[32768];int read;while((read=stream.read(buffer))!=-1){if(output.size()+read>LIMIT*2)throw new IOException("Copy is too large.");output.write(buffer,0,read);}return output.toString("UTF-8");}}
 private String digest(String data) throws Exception {byte[] bytes=MessageDigest.getInstance("SHA-256").digest(data.getBytes(StandardCharsets.UTF_8));StringBuilder hex=new StringBuilder();for(byte b:bytes)hex.append(String.format("%02x",b&255));return hex.toString();}
 private void validate(String data) throws Exception {if(data==null||data.getBytes(StandardCharsets.UTF_8).length>LIMIT)throw new IOException("Device copy exceeds 160 MB. Export large lessons separately.");JSONObject value=new JSONObject(data);if(!"kopy-device-library".equals(value.optString("format"))||value.optInt("version")!=1||value.optJSONArray("notebooks")==null||value.optJSONArray("pages")==null||value.optJSONArray("assets")==null)throw new IOException("Invalid device copy.");}
 @PluginMethod public void read(PluginCall call){executor.execute(()->{try{Uri tree=root();List<Copy> copies=files(tree);for(Copy copy:copies){try{JSONObject wrapper=new JSONObject(readText(document(tree,copy.id)));String data=wrapper.getString("data");if(!digest(data).equals(wrapper.getString("sha256")))continue;validate(data);JSObject value=new JSObject();value.put("data",data);call.resolve(value);return;}catch(Exception ignored){}}if(!copies.isEmpty())throw new IOException("No valid device copies. Existing files were kept. Restore another backup or choose a different folder.");JSObject value=new JSObject();value.put("data",JSONObject.NULL);call.resolve(value);}catch(Exception e){call.reject("Could not read device copies. Choose the folder again.",e);}});}
 @PluginMethod public void write(PluginCall call){String data=call.getString("data");executor.execute(()->{try{validate(data);Uri tree=root();long savedAt=System.currentTimeMillis();String name="library-"+savedAt+"-"+UUID.randomUUID().toString().substring(0,8)+".kopybackup";Uri pending=DocumentsContract.createDocument(getContext().getContentResolver(),document(tree,DocumentsContract.getTreeDocumentId(tree)),"application/octet-stream",name+".pending");if(pending==null)throw new IOException("Folder is not writable.");JSONObject wrapper=new JSONObject();wrapper.put("savedAt",savedAt);wrapper.put("sha256",digest(data));wrapper.put("data",data);
  try(OutputStream stream=getContext().getContentResolver().openOutputStream(pending,"w")){if(stream==null)throw new IOException("Could not save device copy.");stream.write(wrapper.toString().getBytes(StandardCharsets.UTF_8));stream.flush();}
  // Publish only after the complete file has been written and verified.
  JSONObject check=new JSONObject(readText(pending));if(!digest(check.getString("data")).equals(check.getString("sha256")))throw new IOException("Saved copy could not be verified.");
  Uri published=DocumentsContract.renameDocument(getContext().getContentResolver(),pending,name);if(published==null)throw new IOException("This provider cannot publish backups safely. Choose a local Documents folder.");
  List<Copy> copies=files(tree);for(int i=3;i<copies.size();i++)DocumentsContract.deleteDocument(getContext().getContentResolver(),document(tree,copies.get(i).id));JSObject value=new JSObject();value.put("savedAt",savedAt);call.resolve(value);
 }catch(Exception e){call.reject("Device save failed: "+e.getMessage()+". In-app lessons are still saved.",e);}});}
 @Override protected void handleOnDestroy(){executor.shutdown();super.handleOnDestroy();}
}
