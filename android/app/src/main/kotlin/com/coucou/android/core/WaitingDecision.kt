package com.coucou.android.core

import com.coucou.android.link.ApprovalRequest
import com.coucou.android.link.QuestionRequest
import com.coucou.android.link.SessionInfo

data class WaitingDecision(val pillId:String,val agent:String,val project:String?,val sinceMs:Long,val question:Boolean)
object WaitingDecisions {
    fun first(approvals:List<ApprovalRequest>,questions:List<QuestionRequest>,sessions:List<SessionInfo>,name:(String)->String):WaitingDecision? {
        val pending=approvals.map { Triple(it.pillId,it.createdAtMs,false) }+questions.map { Triple(it.pillId,it.createdAtMs,true) }
        val next=pending.minByOrNull { it.second } ?: return null
        val project=sessions.firstOrNull { it.pillId==next.first }?.project?.takeIf { it.isNotBlank() }?.take(60)
        return WaitingDecision(next.first,name(next.first).take(60),project,next.second,next.third)
    }
}
