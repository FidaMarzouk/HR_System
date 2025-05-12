import React, { useState } from 'react';
import { Button } from './button';

export const Calendar = ({ 
  mode = 'single',
  selected,
  onSelect,
  ...props 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };
  
  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() - 1);
      return newMonth;
    });
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + 1);
      return newMonth;
    });
  };
  
  const handleDateSelect = (day) => {
    if (onSelect) {
      const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      onSelect(newDate);
    }
  };
  
  const renderCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Add empty days for padding
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }
    
    // Get current date for highlighting today
    const today = new Date();
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isSelected = selected && date.getDate() === selected.getDate() && 
                         date.getMonth() === selected.getMonth() && 
                         date.getFullYear() === selected.getFullYear();
      
      const isToday = today.getDate() === day && 
                      today.getMonth() === month && 
                      today.getFullYear() === year;
      
      days.push(
        <button
        key={day}
        className={`h-7 w-7 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-xs sm:text-sm transition-all duration-200 ${
          isSelected 
            ? 'bg-[#2dd4bf] text-[#1e262c] font-medium shadow-md shadow-[#2dd4bf]/20' 
            : isToday
              ? 'border border-[#2dd4bf] text-[#2dd4bf] hover:bg-[#2dd4bf]/10'
              : 'text-white hover:bg-[#2dd4bf]/10'
        }`}
        onClick={() => handleDateSelect(day)}
      >
        {day}
      </button>
      );
    }
    
    return days;
  };
  
  return (
    <div className="p-3 sm:p-5 text-white rounded-lg w-full max-w-xs mx-auto" {...props}>
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <Button 
          variant="ghost" 
          onClick={handlePrevMonth}
          className="text-[#2dd4bf] hover:bg-[#2dd4bf]/10 h-8 w-8 p-0 rounded-full"
        >
          &lt;
        </Button>
        <div className="font-medium text-white text-lg">
          {currentMonth.toLocaleString('default', { month: 'long' })} {currentMonth.getFullYear()}
        </div>
        <Button 
          variant="ghost" 
          onClick={handleNextMonth}
          className="text-[#2dd4bf] hover:bg-[#2dd4bf]/10 h-8 w-8 p-0 rounded-full"
        >
          &gt;
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2 sm:mb-3">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
           <div key={day} className="h-6 sm:h-8 w-6 sm:w-8 flex items-center justify-center text-xs font-medium text-gray-400">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>
    </div>
  );
};