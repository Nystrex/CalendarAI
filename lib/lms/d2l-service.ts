// D2L Brightspace API Service
// For CourseLink integration

export interface D2LCredentials {
  clientId: string
  clientSecret: string
  baseUrl: string // e.g., "https://courselink.uoguelph.ca"
}

export interface D2LUser {
  Identifier: string
  DisplayName: string
  EmailAddress: string
  OrgDefinedId: string
}

export interface D2LCourse {
  Identifier: string
  Name: string
  Code: string
  IsActive: boolean
  Department: string
  Semester: string
}

export interface D2LAssignment {
  Identifier: string
  Name: string
  Description?: { Text: string }
  DueDate?: string
  Score?: { Max: number }
  AssignmentType: string
  Instructions?: { Text: string }
  AssociatedEntity?: { Id: string }
}

export class D2LService {
  private credentials: D2LCredentials
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor(credentials: D2LCredentials) {
    this.credentials = credentials
  }

  // OAuth 2.0 Flow for D2L
  async authenticate(username: string, password: string): Promise<boolean> {
    try {
      // Step 1: Get authorization code
      const authUrl = `${this.credentials.baseUrl}/d2l/auth/api/token`
      const authParams = new URLSearchParams({
        client_id: this.credentials.clientId,
        redirect_uri: `${window.location.origin}/auth/d2l/callback`,
        response_type: 'code',
        scope: 'core:* assignments:*'
      })

      // For web app, redirect to D2L login
      window.location.href = `${authUrl}?${authParams.toString()}`
      return true
    } catch (error) {
      console.error('D2L authentication error:', error)
      return false
    }
  }

  // Handle OAuth callback
  async handleCallback(code: string): Promise<void> {
    try {
      const tokenUrl = `${this.credentials.baseUrl}/d2l/auth/api/token`
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
          redirect_uri: `${window.location.origin}/auth/d2l/callback`,
        }),
      })

      const tokens = await response.json()
      this.accessToken = tokens.access_token
      this.refreshToken = tokens.refresh_token
      this.tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000)
    } catch (error) {
      console.error('D2L callback error:', error)
      throw error
    }
  }

  // Refresh access token
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const tokenUrl = `${this.credentials.baseUrl}/d2l/auth/api/token`
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
        }),
      })

      const tokens = await response.json()
      this.accessToken = tokens.access_token
      this.refreshToken = tokens.refresh_token
      this.tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000)
    } catch (error) {
      console.error('D2L token refresh error:', error)
      throw error
    }
  }

  // Ensure token is valid
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      await this.refreshAccessToken()
    }
  }

  // Make authenticated API call
  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    await this.ensureValidToken()

    const url = `${this.credentials.baseUrl}/d2l/api/lp/${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`D2L API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Get current user info
  async getCurrentUser(): Promise<D2LUser> {
    return this.apiCall('users/whoami')
  }

  // Get user's courses
  async getCourses(): Promise<D2LCourse[]> {
    const orgUnitId = await this.getOrgUnitId()
    return this.apiCall(`enrollments/myenrollments/${orgUnitId}`)
  }

  // Get organization unit ID
  private async getOrgUnitId(): Promise<number> {
    const user = await this.getCurrentUser()
    // Extract org unit ID from user info
    return parseInt(user.Identifier.split('_')[1])
  }

  // Get assignments for a course
  async getAssignments(courseId: string): Promise<D2LAssignment[]> {
    try {
      // Get dropbox folders (assignments)
      const dropboxes = await this.apiCall(`dropbox/folders/${courseId}`)
      
      // Get quizzes
      const quizzes = await this.apiCall(`quizzes/${courseId}`)
      
      // Get grade items for exams
      const gradeItems = await this.apiCall(`grade/items/${courseId}`)
      
      // Combine all assignment types
      const assignments: D2LAssignment[] = []
      
      // Process dropboxes
      dropboxes.forEach((dropbox: any) => {
        assignments.push({
          Identifier: dropbox.Id,
          Name: dropbox.Name,
          Description: dropbox.Description,
          DueDate: dropbox.DueDate,
          Score: dropbox.Score,
          AssignmentType: 'Assignment',
          AssociatedEntity: { Id: courseId }
        })
      })
      
      // Process quizzes
      quizzes.forEach((quiz: any) => {
        assignments.push({
          Identifier: quiz.Id,
          Name: quiz.Name,
          Description: quiz.Description,
          DueDate: quiz.EndTime,
          Score: quiz.Score,
          AssignmentType: 'Quiz',
          AssociatedEntity: { Id: courseId }
        })
      })
      
      // Process grade items (exams)
      gradeItems.forEach((gradeItem: any) => {
        if (gradeItem.AssociatedEntityType === 'Quiz' || gradeItem.AssociatedEntityType === 'Dropbox') {
          return // Skip if already covered
        }
        
        assignments.push({
          Identifier: gradeItem.Id,
          Name: gradeItem.Name,
          Description: gradeItem.Description,
          DueDate: gradeItem.DueDate,
          Score: { Max: gradeItem.MaxPoints },
          AssignmentType: 'Exam',
          AssociatedEntity: { Id: courseId }
        })
      })
      
      return assignments
    } catch (error) {
      console.error('Error fetching assignments:', error)
      return []
    }
  }

  // Get all assignments for all courses
  async getAllAssignments(): Promise<{ course: D2LCourse; assignments: D2LAssignment[] }[]> {
    const courses = await this.getCourses()
    const results = []
    
    for (const course of courses.filter(c => c.IsActive)) {
      try {
        const assignments = await this.getAssignments(course.Identifier)
        results.push({ course, assignments })
      } catch (error) {
        console.error(`Error fetching assignments for course ${course.Name}:`, error)
      }
    }
    
    return results
  }

  // Sync assignments to local database
  async syncAssignments(userId: string, universityId: string): Promise<void> {
    try {
      const allAssignments = await this.getAllAssignments()
      
      // This would sync to your Supabase database
      // Implementation depends on your database schema
      console.log('Syncing assignments for user:', userId)
      console.log('Found assignments:', allAssignments.length)
      
      // TODO: Implement database sync logic
      // 1. Upsert courses
      // 2. Upsert assignments
      // 3. Update sync logs
      
    } catch (error) {
      console.error('Assignment sync error:', error)
      throw error
    }
  }
}

// Singleton instance for CourseLink
export const courseLinkService = new D2LService({
  clientId: process.env.NEXT_PUBLIC_D2L_CLIENT_ID!,
  clientSecret: process.env.D2L_CLIENT_SECRET!,
  baseUrl: 'https://courselink.uoguelph.ca'
})
