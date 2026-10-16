package com.coucou.android.core

import org.json.JSONArray
import java.net.URL
import javax.net.ssl.HttpsURLConnection

data class AppRelease(val version:String,val url:String,val newer:Boolean)
object AppUpdates {
    private fun version(v:String):List<Int>? { return v.substringBefore('-').split('.').map { it.toIntOrNull() ?: return null }.takeIf { it.size==3 } }
    private fun compare(a:List<Int>,b:List<Int>):Int { for(i in 0..2) if(a[i]!=b[i])return a[i].compareTo(b[i]); return 0 }
    fun pick(releases:JSONArray,current:String):AppRelease? {
        val installed=version(current) ?: return null
        var best:AppRelease?=null; var number=installed
        for(i in 0 until releases.length()) {
            val release=releases.getJSONObject(i);if(release.optBoolean("draft"))continue
            val assets=release.optJSONArray("assets") ?: continue
            for(j in 0 until assets.length()) {
                val a=assets.getJSONObject(j)
                val match=Regex("KiroPiko-Android-(\\d+\\.\\d+\\.\\d+-preview)\\.apk").matchEntire(a.optString("name")) ?: continue
                val label=match.groupValues[1]; val parsed=version(label) ?: continue
                val url=a.optString("browser_download_url")
                if(!url.startsWith("https://github.com/Davichik353/KiroPiko/releases/download/"))continue
                if(best==null || compare(parsed,number)>0) { best=AppRelease(label,url,compare(parsed,installed)>0);number=parsed }
            }
        }
        return best
    }
    /** Only invoked by an explicit button, no pairing token or AI key is used. */
    fun check(current:String):AppRelease? {
        val c=URL("https://api.github.com/repos/Davichik353/KiroPiko/releases?per_page=20").openConnection() as HttpsURLConnection
        try {
            c.connectTimeout=15000;c.readTimeout=20000;c.instanceFollowRedirects=false
            c.setRequestProperty("User-Agent","KiroPiko-update-check")
            kotlin.check(c.responseCode==200) { "HTTP ${c.responseCode}" }
            val bytes=ByteArray(512*1024+1);var total=0
            c.inputStream.use { input -> while(total<bytes.size) { val n=input.read(bytes,total,bytes.size-total);if(n<0)break;total+=n } }
            kotlin.check(total<bytes.size) { "Release list too large" }
            return pick(JSONArray(String(bytes,0,total,Charsets.UTF_8)),current)
        } finally { c.disconnect() }
    }
}
