package com.coucou.android.ui

import androidx.compose.runtime.*
import androidx.compose.material3.Text
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import com.coucou.android.R
import com.coucou.android.app.AppModel
import com.coucou.android.core.AppUpdates
import com.coucou.android.core.AppRelease
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable fun SupportCard(model:AppModel) {
    val context=LocalContext.current;val clipboard=LocalClipboardManager.current;val uri=LocalUriHandler.current;val scope=rememberCoroutineScope()
    val current=remember { context.packageManager.getPackageInfo(context.packageName,0).versionName ?: "?" }
    var report by remember { mutableStateOf<String?>(null) };var busy by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) };var release by remember { mutableStateOf<AppRelease?>(null) }
    val noRelease=stringResource(R.string.support_no_release);val latest=stringResource(R.string.support_latest,current)
    val failed=stringResource(R.string.support_update_failed);val available=stringResource(R.string.support_update_ready)
    val copyLabel=stringResource(R.string.support_copied)
    Panel {
        Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
            Text(stringResource(R.string.support_version,current))
            PillButton(stringResource(R.string.support_report),{ report=model.supportReport() },Modifier.fillMaxWidth())
            if(report!=null) {
                SelectionContainer { Text(report!!) }
                Text(stringResource(R.string.support_private))
                PillButton(stringResource(R.string.diag_copy),{ clipboard.setText(AnnotatedString(report!!));status=copyLabel },Modifier.fillMaxWidth())
            }
            PillButton(stringResource(R.string.support_check),{
                busy=true;release=null;status=null
                scope.launch {
                    try { val found=withContext(Dispatchers.IO){ AppUpdates.check(current) };release=found?.takeIf{it.newer};status=if(found==null)noRelease else if(found.newer)"${found.version}. $available" else latest }
                    catch(_:Exception){status=failed}finally{busy=false}
                }
            },Modifier.fillMaxWidth(),enabled=!busy)
            if(busy)Text(stringResource(R.string.support_checking))
            status?.let { Text(it) }
            release?.let { r -> PillButton(stringResource(R.string.support_download),{ runCatching { uri.openUri(r.url) }.onFailure { status=failed } },Modifier.fillMaxWidth(),PillKind.PRIMARY) }
            Text(stringResource(R.string.support_update_note))
        }
    }
}
