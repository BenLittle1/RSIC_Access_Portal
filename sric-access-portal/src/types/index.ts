// Common types used throughout the application

export interface Profile {
  id: string
  user_id: string
  full_name: string
  username: string
  email?: string
  organization: string
  authentication_status: 'Pending' | 'Approved' | 'Denied'
  created_at: string
  updated_at?: string
}

export interface Guest {
  id: string
  name: string
  visit_date: string
  estimated_arrival: string
  arrival_status: boolean
  floor_access: string
  inviter_id: string
  organization: string
  requester_email?: string
  inviter_name?: string
  created_at?: string
}

export interface User {
  id: string
  email: string
  created_at: string
}

export type Organization = 'Security' | 'AXL' | 'Knowledgehook' | 'Yscope'

export const ORGANIZATIONS: Organization[] = ['Security', 'AXL', 'Knowledgehook', 'Yscope'] 