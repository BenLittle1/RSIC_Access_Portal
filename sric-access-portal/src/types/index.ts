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

// Email Processing Types
export interface EmailProcessedGuest {
  id: string
  user_id: string
  sender_email: string
  email_subject?: string
  original_email_content: string
  extracted_data: ExtractedGuestData
  processing_status: 'pending' | 'approved' | 'rejected' | 'error'
  confidence_score?: number
  ai_model_used?: string
  processing_errors?: string[]
  guest_id?: string
  created_at: string
  processed_at?: string
  approved_by?: string
  rejected_reason?: string
}

export interface ExtractedGuestData {
  name: string
  visit_date: string
  estimated_arrival: string
  organization: string
  floor_access: string
  purpose?: string
  notes?: string
  confidence_score?: number
}

export interface EmailProcessingStats {
  user_id: string
  total_emails_processed: number
  pending_count: number
  approved_count: number
  rejected_count: number
  error_count: number
  avg_confidence_score: number
  last_email_processed: string
}

export interface EmailProcessingResult {
  success: boolean
  record_id?: string
  extracted_guests: ExtractedGuestData[]
  confidence_score: number
  errors?: string[]
  message: string
}

export interface User {
  id: string
  email: string
  created_at: string
}

export type Organization = 'Security' | 'AXL' | 'Knowledgehook' | 'Yscope'

export const ORGANIZATIONS: Organization[] = ['Security', 'AXL', 'Knowledgehook', 'Yscope'] 