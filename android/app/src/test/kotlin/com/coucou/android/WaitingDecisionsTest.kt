package com.coucou.android
import com.coucou.android.core.WaitingDecisions
import com.coucou.android.link.*
import com.coucou.android.mochi.BotState
import org.junit.Assert.*
import org.junit.Test
class WaitingDecisionsTest {
    @Test fun oldestQuestionWinsAndNeverCopiesCommands() {
        val session=SessionInfo("a","Agent",BotState.QUESTION,"",0,0,0,project="KiroPiko")
        val result=WaitingDecisions.first(listOf(ApprovalRequest("b","token","shell","SECRET COMMAND",200)),listOf(QuestionRequest("a","token2",emptyList(),100)),listOf(session)){"Agent $it"}!!
        assertEquals("a",result.pillId);assertEquals("KiroPiko",result.project);assertTrue(result.question);assertEquals(100L,result.sinceMs)
        assertFalse(result.toString().contains("SECRET"));assertFalse(result.toString().contains("token"))
    }
    @Test fun missingDetailsStayMissingAndResolvedRequestsDisappear() {
        val result=WaitingDecisions.first(listOf(ApprovalRequest("a","t","shell","private",20)),emptyList(),emptyList()){"Agent"}!!
        assertNull(result.project)
        assertNull(WaitingDecisions.first(emptyList(),emptyList(),emptyList()){"Agent"})
    }
}
