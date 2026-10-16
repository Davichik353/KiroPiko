package com.coucou.android
import com.coucou.android.core.AppUpdates
import org.json.JSONArray
import org.junit.Assert.*
import org.junit.Test
class AppUpdatesTest {
    @Test fun comparesNumericallyAndOnlyUsesThisProjectsArtifacts() {
        val data=JSONArray("""[{"assets":[
            {"name":"KiroPiko-Android-0.1.9-preview.apk","browser_download_url":"https://github.com/Davichik353/KiroPiko/releases/download/v/old"},
            {"name":"KiroPiko-Android-0.1.10-preview.apk","browser_download_url":"https://github.com/Davichik353/KiroPiko/releases/download/v/new"},
            {"name":"KiroPiko-Android-9.0.0-preview.apk","browser_download_url":"https://evil.test/fake.apk"}
        ]}]""")
        assertEquals("0.1.10-preview",AppUpdates.pick(data,"0.1.9-preview")?.version)
        assertTrue(AppUpdates.pick(data,"0.1.9-preview")!!.newer)
        assertFalse(AppUpdates.pick(data,"0.1.10-preview")!!.newer)
        assertNull(AppUpdates.pick(JSONArray(),"0.1.0-preview"))
    }
}
