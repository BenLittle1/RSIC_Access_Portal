import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

interface CalendarViewProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

const CalendarView = ({ selectedDate, onSelectDate }: CalendarViewProps) => {
  const handleDayClick = (date: Date | undefined) => {
    if (date) {
      onSelectDate(date)
    }
  }

  return (
    <div className="h-full bg-white p-6">
      <h3 className="text-xl font-bold text-black mb-4 border-b border-black pb-2">
        Calendar
      </h3>
      
      <div 
        className="calendar-container"
        style={{
          '--rdp-cell-size': '40px',
          '--rdp-accent-color': '#000000',
          '--rdp-background-color': '#ffffff',
          '--rdp-accent-color-dark': '#333333',
          '--rdp-background-color-dark': '#f9f9f9',
          '--rdp-outline': '2px solid #000000',
          '--rdp-outline-selected': '2px solid #000000',
        } as React.CSSProperties}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
            .calendar-container .rdp {
              font-family: inherit;
            }
            
            .calendar-container .rdp-months {
              display: flex;
              justify-content: center;
            }
            
            .calendar-container .rdp-month {
              margin: 0;
            }
            
            .calendar-container .rdp-caption {
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0 0 1rem 0;
              margin: 0;
              position: relative;
            }
            
            .calendar-container .rdp-caption_label {
              font-size: 1.25rem;
              font-weight: bold;
              color: #000000;
            }
            
            .calendar-container .rdp-nav {
              position: absolute;
              top: 0;
              right: 0;
              display: flex;
              gap: 0.5rem;
              align-items: center;
              padding: 0;
            }
            
            .calendar-container .rdp-nav_button {
              background: none;
              border: 1px solid #000000;
              color: #000000;
              cursor: pointer;
              padding: 0.5rem;
              border-radius: 0;
              transition: all 0.2s;
              width: 2rem;
              height: 2rem;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .calendar-container .rdp-nav_button:hover {
              background-color: #000000;
              color: #ffffff;
            }
            
            .calendar-container .rdp-nav_button:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
            
            .calendar-container .rdp-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 1rem;
            }
            
            .calendar-container .rdp-head_cell {
              font-weight: bold;
              color: #000000;
              padding: 0.5rem;
              text-align: center;
              border-bottom: 1px solid #000000;
            }
            
            .calendar-container .rdp-cell {
              text-align: center;
              padding: 0;
              border: 1px solid #e5e5e5;
            }
            
            .calendar-container .rdp-button {
              border: none;
              background: none;
              color: #000000;
              cursor: pointer;
              width: 100%;
              height: var(--rdp-cell-size);
              border-radius: 0;
              transition: all 0.2s;
              font-size: 0.9rem;
            }
            
            .calendar-container .rdp-button:hover {
              background-color: #f0f0f0;
            }
            
            .calendar-container .rdp-button_reset {
              border: none;
              background: none;
              color: inherit;
              cursor: pointer;
            }
            
            .calendar-container .rdp-day_today {
              font-weight: bold;
              border: 2px solid #000000;
            }
            
            .calendar-container .rdp-day_selected {
              background-color: #000000 !important;
              color: #ffffff !important;
              font-weight: bold;
            }
            
            .calendar-container .rdp-day_selected:hover {
              background-color: #333333 !important;
            }
            
            .calendar-container .rdp-day_outside {
              color: #cccccc;
            }
            
            .calendar-container .rdp-day_disabled {
              color: #cccccc;
              cursor: not-allowed;
            }
            
            .calendar-container .rdp-day_range_start,
            .calendar-container .rdp-day_range_end,
            .calendar-container .rdp-day_range_middle {
              background-color: #000000;
              color: #ffffff;
            }
          `
        }} />
        
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={handleDayClick}
          showOutsideDays
          fixedWeeks
        />
      </div>
      
      <div className="mt-6 p-4 border border-black bg-gray-50">
        <h4 className="font-bold text-black mb-2">Selected Date</h4>
        <p className="text-black">
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>
    </div>
  )
}

export default CalendarView 