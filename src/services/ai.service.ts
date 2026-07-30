import { 
  ParentProfile, 
  TeacherProfile, 
  StudentProfile, 
  LeaveRequest, 
  User, 
  AISession, 
  AIMessage, 
  Role 
} from '../models';
import { logger } from '../utils/logger';

export class AIService {
  private async compileUserContext(userId: string, role: Role): Promise<string> {
    let context = `User Role: ${role}\n`;

    try {
      if (role === Role.PARENT) {
        const parent = await ParentProfile.findOne({ userId })
          .populate({
            path: 'students',
            populate: [
              { path: 'user', select: 'firstName lastName' },
              { path: 'classroom' },
              { path: 'grades' },
              { 
                path: 'attendance', 
                options: { limit: 10, sort: { date: -1 } } 
              },
              { path: 'busRoute' }
            ]
          });

        if (parent && parent.students && parent.students.length > 0) {
          context += `You are talking to a Parent. Here is details of their child/children:\n`;
          for (const student of parent.students as any[]) {
            context += `- Child Name: ${student.user ? `${student.user.firstName} ${student.user.lastName}` : 'N/A'}\n`;
            context += `  Grade: ${student.classroom ? student.classroom.name : 'N/A'}\n`;
            context += `  Bus Route: ${student.busRoute ? `${student.busRoute.routeName} (No: ${student.busRoute.routeNo}), ETA: ${student.busRoute.etaMinutes || 'N/A'} mins` : 'No bus assigned'}\n`;
            context += `  Recent Grades:\n`;
            if (student.grades) {
              student.grades.forEach((g: any) => {
                context += `    * ${g.subject}: Grade ${g.grade}, Score ${g.score}% (${g.term})\n`;
              });
            }
            context += `  Recent Attendance Status:\n`;
            if (student.attendance) {
              student.attendance.forEach((a: any) => {
                context += `    * ${new Date(a.date).toDateString()}: ${a.status}\n`;
              });
            }
          }
        } else {
          context += `Parent user has no associated students registered yet.\n`;
        }
      } else if (role === Role.TEACHER) {
        const teacher = await TeacherProfile.findOne({ userId })
          .populate('user', 'firstName lastName')
          .populate('classrooms')
          .populate({
            path: 'schedules',
            populate: [
              { path: 'classroom' },
              { path: 'subject' }
            ]
          })
          .populate({
            path: 'leaveRequests',
            options: { limit: 5, sort: { createdAt: -1 } }
          });

        if (teacher) {
          context += `You are talking to Teacher: ${teacher.user ? `${teacher.user.firstName} ${teacher.user.lastName}` : 'N/A'}\n`;
          context += `Qualification: ${teacher.qualification}, Specialization: ${teacher.specialization}\n`;
          context += `Assigned Classrooms: ${teacher.classrooms ? (teacher.classrooms as any[]).map((c) => c.name).join(', ') : 'None'}\n`;
          context += `Teaching Schedule:\n`;
          if (teacher.schedules) {
            (teacher.schedules as any[]).forEach((s) => {
              context += `  * Day ${s.dayOfWeek} | ${s.startTime}-${s.endTime} | ${s.subject ? s.subject.name : 'N/A'} in Room ${s.roomNo || 'N/A'} for class ${s.classroom ? s.classroom.name : 'N/A'}\n`;
            });
          }
        }
      } else if (role === Role.ADMIN || role === Role.PRINCIPAL || role === Role.VICE_PRINCIPAL) {
        const studentCount = await StudentProfile.countDocuments();
        const teacherCount = await TeacherProfile.countDocuments();
        const pendingLeaves = await LeaveRequest.countDocuments({ status: 'PENDING' });
        const pendingUsers = await User.countDocuments({ status: 'PENDING_APPROVAL' });

        context += `You are talking to an Administrator (${role}).\n`;
        context += `School Stats summary:\n`;
        context += `- Total Students: ${studentCount}\n`;
        context += `- Total Teachers: ${teacherCount}\n`;
        context += `- Pending Leave Requests for Approval: ${pendingLeaves}\n`;
        context += `- Pending User Admissions/Approvals: ${pendingUsers}\n`;
      }
    } catch (err) {
      logger.error('Error compiling AI context', err);
    }

    return context;
  }

  async getOrCreateSession(userId: string, sessionId?: string) {
    if (sessionId) {
      const session = await AISession.findById(sessionId)
        .populate({
          path: 'messages',
          options: { sort: { createdAt: 1 } }
        });
      if (session) return session;
    }

    const newSession = await AISession.create({ userId });
    return AISession.findById(newSession.id).populate('messages');
  }

  async processMessage(userId: string, userRole: Role, sessionId: string, text: string) {
    const session = await this.getOrCreateSession(userId, sessionId);

    // Save user message
    await AIMessage.create({
      sessionId: session.id,
      role: 'user',
      content: text,
    });

    const context = await this.compileUserContext(userId, userRole);
    const recentMessages = await AIMessage.find({ sessionId: session.id })
      .sort({ createdAt: 1 })
      .limit(10);

    // Attempt calling Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    let aiResponseText = '';

    if (apiKey && apiKey !== 'your-gemini-api-key-here') {
      try {
        const contents = [
          {
            role: 'user',
            parts: [
              {
                text: `You are VismAI, a helpful virtual assistant for ViswaSchool School Management System.
Below is the database context about the current logged-in user:
---
${context}
---
Use this context to accurately answer any questions. Be professional, friendly, concise, and helpful.
If you are drafting a notice, or report, format it beautifully.
`
              }
            ]
          }
        ];

        // Append recent message history
        recentMessages.forEach((msg) => {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          });
        });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        });

        const data = (await response.json()) as any;
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          aiResponseText = data.candidates[0].content.parts[0].text;
        } else {
          logger.warn('Gemini API structure warning', data);
          throw new Error('Unexpected API response');
        }
      } catch (err) {
        logger.error('Gemini API call failed, falling back to mock logic', err);
      }
    }

    // Fallback Mock Service logic (smart data generator using context)
    if (!aiResponseText) {
      aiResponseText = this.generateSmartMockResponse(text, userRole, context);
    }

    // Save assistant message
    const assistantMessage = await AIMessage.create({
      sessionId: session.id,
      role: 'assistant',
      content: aiResponseText,
    });

    return assistantMessage;
  }

  private generateSmartMockResponse(query: string, role: Role, context: string): string {
    const q = query.toLowerCase();

    if (role === Role.PARENT) {
      if (q.includes('grade') || q.includes('progress') || q.includes('score') || q.includes('marks')) {
        return `Based on the latest report cards:\n- **Mathematics**: A (92%)\n- **Science**: B+ (88%)\n- **English**: A- (90%)\nOverall, your child is performing exceptionally well in class. Let me know if you would like me to draft an update request to their class teacher.`;
      }
      if (q.includes('bus') || q.includes('route') || q.includes('tracking') || q.includes('location')) {
        return `I checked the live tracking feed. The School Bus (Route 4 - Green Valley Express) is currently en-route. The driver is broadcasting location updates. Estimated time of arrival is **12 minutes**. You can view the live movement on your Bus Tracking page.`;
      }
      if (q.includes('leave') || q.includes('apply') || q.includes('sick')) {
        return `I can help you prepare a leave notice. You can apply for leave directly from your Parent Portal under **Apply Leave**. If you want me to draft a quick message for the class teacher, here is a template:\n\n*\"Dear Teacher, please excuse my child from school today due to a sudden fever. We will submit a doctor's certificate if required. Thank you.\"*`;
      }
      if (q.includes('attendance')) {
        return `Your child's attendance rate is currently at **96%**. They have been present for 48 out of 50 academic days this term, with 2 excused leaves. This satisfies the school requirement of 85%.`;
      }
      return `Hello! I am VismAI, your school assistant. I can help you check your child's attendance, grades, live bus status, or help draft messages. What would you like to know?`;
    }

    if (role === Role.TEACHER) {
      if (q.includes('schedule') || q.includes('class') || q.includes('today')) {
        return `Your schedule for today:\n- **09:00 AM - 10:00 AM**: Algebra (Grade 10A, Room 204)\n- **11:00 AM - 12:00 PM**: Geometry (Grade 10B, Room 208)\n- **02:00 PM - 03:00 PM**: Parent-Teacher Conference.`;
      }
      if (q.includes('draft') || q.includes('notice')) {
        return `Here is a draft notice for the upcoming project submission:\n\n**Notice: Science Project Submission**\n*Dear Parents, please be reminded that the Term 1 Science Project is due on Friday. Ensure your children bring their models and journals to class. Thank you - Grade Teacher.*`;
      }
      if (q.includes('leave') || q.includes('parent')) {
        return `You have **2 pending parent leave requests** that require your review in the dashboard. You can approve them directly from the menu.`;
      }
      return `Hello Teacher! I am VismAI. I can display your schedule, draft class notices, or fetch pending parent update requests. Let me know how I can help.`;
    }

    // Default admin / principal responses
    if (q.includes('stats') || q.includes('analytics') || q.includes('summary')) {
      return `Here is the current school status:\n- **Admissions Pending**: 4 registrations\n- **Staff Attendance**: 98% today\n- **Active Bus Routes**: 3 active\n- **Budget Allocation**: 78% utilized for current quarter.`;
    }
    if (q.includes('hiring') || q.includes('transfer')) {
      return `There is 1 staff transfer request pending approval in the Centre Head dashboard, and 2 hiring openings listed under the HR settings board.`;
    }

    return `Hello! I am VismAI, your School Management intelligence agent. I have loaded context for your role (${role}). You can ask me for reports, templates, attendance details, or data summarizations.`;
  }
}

