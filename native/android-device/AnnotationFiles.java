package org.kopynotes.app;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** Only writes app-owned annotation files in the user-granted shared folder. */
final class AnnotationFiles {
 private final Context context;
 AnnotationFiles(Context context){this.context=context;}
 private Uri folder() throws Exception {
  String selected=context.getSharedPreferences("kopy-device-folder",0).getString("tree",null);if(selected==null)throw new IOException("Choose a device folder in Kopy settings to keep annotations after uninstall.");
  Uri tree=Uri.parse(selected),parent=DocumentsContract.buildDocumentUriUsingTree(tree,DocumentsContract.getTreeDocumentId(tree));
  Uri existing=find(parent,"Annotations");return existing!=null?existing:DocumentsContract.createDocument(context.getContentResolver(),parent,DocumentsContract.Document.MIME_TYPE_DIR,"Annotations");
 }
 private Uri find(Uri parent,String name) throws Exception {for(Uri file:children(parent)){try(Cursor cursor=context.getContentResolver().query(file,new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME},null,null,null)){if(cursor!=null&&cursor.moveToFirst()&&name.equals(cursor.getString(0)))return file;}}return null;}
 private List<Uri> children(Uri parent) throws Exception {List<Uri> result=new ArrayList<>();Uri query=DocumentsContract.buildChildDocumentsUriUsingTree(parent,DocumentsContract.getDocumentId(parent));try(Cursor cursor=context.getContentResolver().query(query,new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID},null,null,null)){if(cursor==null)throw new IOException("Device folder permission unavailable.");while(cursor.moveToNext())result.add(DocumentsContract.buildDocumentUriUsingTree(parent,cursor.getString(0)));}return result;}
 private String name(Uri file) throws Exception {try(Cursor cursor=context.getContentResolver().query(file,new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME},null,null,null)){return cursor!=null&&cursor.moveToFirst()?cursor.getString(0):"";}}
 private String read(Uri file) throws Exception {try(InputStream input=context.getContentResolver().openInputStream(file);ByteArrayOutputStream output=new ByteArrayOutputStream()){if(input==null)throw new IOException("Annotation copy unavailable.");byte[] buffer=new byte[8192];int n;while((n=input.read(buffer))!=-1){if(output.size()+n>16*1024*1024)throw new IOException("Annotation copy too large.");output.write(buffer,0,n);}return output.toString("UTF-8");}}
 private String digest(String data) throws Exception {byte[] bytes=MessageDigest.getInstance("SHA-256").digest(data.getBytes(StandardCharsets.UTF_8));StringBuilder result=new StringBuilder();for(byte b:bytes)result.append(String.format("%02x",b&255));return result.toString();}
 synchronized void save(String data) throws Exception {
  Uri directory=folder();if(directory==null)throw new IOException("Annotation folder could not be created.");String filename="android-ink-"+System.currentTimeMillis()+"-"+UUID.randomUUID().toString().substring(0,8)+".json";
  JSONObject wrapper=new JSONObject();wrapper.put("data",data);wrapper.put("sha256",digest(data));publish(directory,filename,wrapper.toString().getBytes(StandardCharsets.UTF_8),"application/json");
  List<Uri> copies=new ArrayList<>();for(Uri file:children(directory))if(name(file).matches("android-ink-\\d+-[a-f0-9]{8}\\.json"))copies.add(file);copies.sort((a,b)->{try{return name(b).compareTo(name(a));}catch(Exception ignored){return 0;}});for(int i=3;i<copies.size();i++)DocumentsContract.deleteDocument(context.getContentResolver(),copies.get(i));
 }
 synchronized String restore() throws Exception {Uri directory=folder();if(directory==null)return null;List<Uri> copies=new ArrayList<>();for(Uri file:children(directory))if(name(file).matches("android-ink-\\d+-[a-f0-9]{8}\\.json"))copies.add(file);copies.sort((a,b)->{try{return name(b).compareTo(name(a));}catch(Exception ignored){return 0;}});for(Uri file:copies){try{JSONObject wrapper=new JSONObject(read(file));String data=wrapper.getString("data");if(digest(data).equals(wrapper.getString("sha256")))return data;}catch(Exception ignored){}}return null;}
 synchronized void screenshot(byte[] png) throws Exception {Uri directory=folder();if(directory==null)throw new IOException("Annotation folder unavailable.");publish(directory,"display-"+System.currentTimeMillis()+".png",png,"image/png");}
 private void publish(Uri directory,String filename,byte[] data,String mime) throws Exception {Uri pending=DocumentsContract.createDocument(context.getContentResolver(),directory,mime,filename+".pending");if(pending==null)throw new IOException("Could not create annotation file.");try(OutputStream output=context.getContentResolver().openOutputStream(pending,"w")){if(output==null)throw new IOException("Device folder is not writable.");output.write(data);output.flush();}if(DocumentsContract.renameDocument(context.getContentResolver(),pending,filename)==null)throw new IOException("Choose a local folder that supports safe file publishing.");}
}
