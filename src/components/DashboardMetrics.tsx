import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from 'date-fns'

interface MetricsData {
  currentVisitors: number
  todayArrivals: number
  todayPending: number
  todayNoShows: number
  weeklyTotal: number
  topOrganizations: Array<{ name: string; count: number }>
  peakHours: Array<{ hour: number; count: number }>
  recentActivity: Array<{
    guest_name: string
    organization: string
    action: 'arrived' | 'scheduled'
    time: string
  }>
}

interface DashboardMetricsProps {
  isSecurityUser: boolean
  userOrganization: string
  selectedDate: Date
  isOpen: boolean
  onClose: () => void
}

const DashboardMetrics = ({ isSecurityUser, userOrganization, selectedDate, isOpen, onClose }: DashboardMetricsProps) => {
  const [metrics, setMetrics] = useState<MetricsData>({
    currentVisitors: 0,
    todayArrivals: 0,
    todayPending: 0,
    todayNoShows: 0,
    weeklyTotal: 0,
    topOrganizations: [],
    peakHours: [],
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchMetrics()
      // Refresh metrics every 30 seconds when modal is open
      const interval = setInterval(fetchMetrics, 30 * 1000)
      return () => clearInterval(interval)
    }
  }, [isOpen, selectedDate, isSecurityUser, userOrganization])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const today = startOfDay(selectedDate)
      // const todayEnd = endOfDay(selectedDate)
      const weekStart = startOfWeek(selectedDate)
      const weekEnd = endOfWeek(selectedDate)

      // Build base query with organization filtering
      const buildQuery = (query: any) => {
        if (!isSecurityUser) {
          return query.eq('organization', userOrganization)
        }
        return query
      }

      // 1. Current visitors (arrived but no departure tracked yet)
      const { data: currentVisitorsData } = await buildQuery(
        supabase
          .from('guests')
          .select('id')
          .eq('arrival_status', true)
          .eq('visit_date', format(today, 'yyyy-MM-dd'))
      )

      // 2. Today's statistics
      const { data: todayGuests } = await buildQuery(
        supabase
          .from('guests')
          .select('id, arrival_status, estimated_arrival')
          .eq('visit_date', format(today, 'yyyy-MM-dd'))
      )

      const todayArrivals = todayGuests?.filter((g: any) => g.arrival_status).length || 0
      const todayPending = todayGuests?.filter((g: any) => !g.arrival_status).length || 0
      
      // Calculate no-shows (guests whose estimated arrival was more than 2 hours ago and still not arrived)
      const twoHoursAgo = new Date()
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)
      const todayNoShows = todayGuests?.filter((g: any) => {
        if (g.arrival_status) return false
        const estimatedTime = new Date(`${format(today, 'yyyy-MM-dd')}T${g.estimated_arrival}`)
        return estimatedTime < twoHoursAgo
      }).length || 0

      // 3. Weekly total
      const { data: weeklyData } = await buildQuery(
        supabase
          .from('guests')
          .select('id')
          .gte('visit_date', format(weekStart, 'yyyy-MM-dd'))
          .lte('visit_date', format(weekEnd, 'yyyy-MM-dd'))
      )

      // 4. Top organizations (last 7 days)
      const last7Days = subDays(selectedDate, 7)
      const { data: orgData } = await supabase
        .from('guests')
        .select('organization')
        .gte('visit_date', format(last7Days, 'yyyy-MM-dd'))
        .lte('visit_date', format(selectedDate, 'yyyy-MM-dd'))

      const orgCounts = orgData?.reduce((acc, guest) => {
        acc[guest.organization] = (acc[guest.organization] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const topOrganizations = Object.entries(orgCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // 5. Peak hours analysis (last 7 days of arrivals)
      const { data: peakHoursData } = await buildQuery(
        supabase
          .from('guests')
          .select('estimated_arrival')
          .eq('arrival_status', true)
          .gte('visit_date', format(last7Days, 'yyyy-MM-dd'))
          .lte('visit_date', format(selectedDate, 'yyyy-MM-dd'))
      )

      const hourCounts = peakHoursData?.reduce((acc: any, guest: any) => {
        const hour = parseInt(guest.estimated_arrival.split(':')[0])
        acc[hour] = (acc[hour] || 0) + 1
        return acc
      }, {} as Record<number, number>) || {}

      const peakHours = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      // 6. Recent activity (last 24 hours)
      const yesterday = subDays(selectedDate, 1)
      const { data: recentData } = await buildQuery(
        supabase
          .from('guests')
          .select('name, organization, arrival_status, estimated_arrival, visit_date, created_at')
          .gte('visit_date', format(yesterday, 'yyyy-MM-dd'))
          .order('created_at', { ascending: false })
          .limit(10)
      )

      const recentActivity = recentData?.map((guest: any) => ({
        guest_name: guest.name,
        organization: guest.organization,
        action: guest.arrival_status ? 'arrived' : 'scheduled' as 'arrived' | 'scheduled',
        time: guest.arrival_status ? 
          `${guest.visit_date} ${guest.estimated_arrival}` : 
          guest.created_at
      })) || []

      setMetrics({
        currentVisitors: currentVisitorsData?.length || 0,
        todayArrivals,
        todayPending,
        todayNoShows,
        weeklyTotal: weeklyData?.length || 0,
        topOrganizations,
        peakHours,
        recentActivity
      })

    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:00 ${period}`
  }

  const formatTime = (timeString: string) => {
    try {
      return format(new Date(timeString), 'MMM d, h:mm a')
    } catch {
      return timeString
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-black w-4/5 max-w-6xl h-4/5 max-h-screen flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-black p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-black">Dashboard Metrics</h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold text-black hover:bg-gray-100 w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
                <p className="text-gray-500 text-lg">Loading metrics...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6 h-full">
              {/* Left Column - Key Stats */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-black mb-4">Today's Overview</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 border border-black p-4">
                      <div className="text-3xl font-bold text-black">{metrics.currentVisitors}</div>
                      <div className="text-sm text-gray-600">Current Visitors</div>
                    </div>
                    <div className="bg-gray-50 border border-black p-4">
                      <div className="text-3xl font-bold text-green-600">{metrics.todayArrivals}</div>
                      <div className="text-sm text-gray-600">Today's Arrivals</div>
                    </div>
                    <div className="bg-gray-50 border border-black p-4">
                      <div className="text-3xl font-bold text-yellow-600">{metrics.todayPending}</div>
                      <div className="text-sm text-gray-600">Pending Today</div>
                    </div>
                    <div className="bg-gray-50 border border-black p-4">
                      <div className="text-3xl font-bold text-red-600">{metrics.todayNoShows}</div>
                      <div className="text-sm text-gray-600">No-Shows</div>
                    </div>
                  </div>
                </div>

                {/* Weekly Summary */}
                <div>
                  <h3 className="text-lg font-bold text-black mb-4">Weekly Summary</h3>
                  <div className="bg-gray-50 border border-black p-6">
                    <div className="text-4xl font-bold text-blue-600">{metrics.weeklyTotal}</div>
                    <div className="text-sm text-gray-600">Total Guests This Week</div>
                  </div>
                </div>
              </div>

              {/* Middle Column - Organizations & Peak Hours */}
              <div className="space-y-6">
                {/* Top Organizations */}
                {isSecurityUser && metrics.topOrganizations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-black mb-4">Top Organizations (7 days)</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {metrics.topOrganizations.map((org) => (
                        <div key={org.name} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-300">
                          <span className="text-sm font-medium text-black">{org.name}</span>
                          <span className="text-sm font-bold text-black">{org.count} visits</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Peak Hours */}
                <div>
                  <h3 className="text-lg font-bold text-black mb-4">Peak Hours (7 days)</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {metrics.peakHours.map((hour) => (
                      <div key={hour.hour} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-300">
                        <span className="text-sm font-medium text-black">{formatHour(hour.hour)}</span>
                        <span className="text-sm font-bold text-black">{hour.count} arrivals</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Recent Activity */}
              <div>
                <h3 className="text-lg font-bold text-black mb-4">Recent Activity</h3>
                <div className="space-y-2 max-h-full overflow-y-auto">
                  {metrics.recentActivity.map((activity, index) => (
                    <div key={index} className="p-3 bg-gray-50 border border-gray-300">
                      <div className="text-sm font-medium text-black">{activity.guest_name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {activity.organization}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {activity.action === 'arrived' ? '✅ Arrived' : '📅 Scheduled'} • {formatTime(activity.time)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black p-4 bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Auto-refreshes every 30 seconds</span>
            <span>Last updated: {format(new Date(), 'h:mm:ss a')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardMetrics 