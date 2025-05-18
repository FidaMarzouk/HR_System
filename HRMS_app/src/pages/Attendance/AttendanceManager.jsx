import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Clock, Coffee, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import AttendanceReports from './AttendanceReports';
import Swal from 'sweetalert2';


const AttendanceManager = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [attendance, setAttendance] = useState(null);
    const [allSessions, setAllSessions] = useState([]);
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const showErrorAlert = (title, error) => {
        // Log the full error for debugging
        console.error(title, error);

        // Extract meaningful error message
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';

        Swal.fire({
            icon: 'error',
            title: title,
            text: errorMessage,
            background: '#1e262c',
            color: '#ef4444', // red color for error
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Got it',
            customClass: {
                popup: 'rounded-lg shadow-xl',
                title: 'text-red-500',
                content: 'text-[#94a3b8]'
            }
        });
    };
    
    // Fetch current user 
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        
        // Fetch the current user using cookie authentication
        const fetchCurrentUser = async () => {
            try {
                const response = await fetch('http://localhost:8080/api/users/me', {
                    method: 'GET',
                    credentials: 'include', 
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Not authenticated');
                }
                
                const userData = await response.json();
                setCurrentUser(userData);
                
                // Once we have the user, fetch both active attendance and all sessions
                if (userData.id) {
                    fetchTodayAttendance(userData.id);
                    fetchAllTodaySessions(userData.id);
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };
        
        fetchCurrentUser();
        
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (attendance?.breaks) {
          const lastBreak = attendance.breaks[attendance.breaks.length - 1];
          const hasOngoingBreak = lastBreak && !lastBreak.endTime;
          setIsOnBreak(hasOngoingBreak);
        }
    }, [attendance]);

    const fetchTodayAttendance = async (userId) => {
        try {
            // This will get the active session (checked in but not checked out)
            const response = await fetch(`http://localhost:8080/api/attendance/history/${userId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch attendance');
            }
            
            const data = await response.json();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Find today's active session (checked in but not checked out)
            const activeSession = data.find(record => {
                if (!record.date) return false;
                const recordDate = new Date(record.date);
                recordDate.setHours(0, 0, 0, 0);
                return recordDate.getTime() === today.getTime() && record.checkIn && !record.checkOut;
            });
            
            setAttendance(activeSession || null);
        } catch (error) {
            console.error('Error fetching today attendance:', error);
        }
    };

    const fetchAllTodaySessions = async (userId) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const response = await fetch(`http://localhost:8080/api/attendance/history/${userId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch attendance');
            }
            
            const data = await response.json();
            
            // Filter to get only today's records
            const todayRecords = data.filter(record => {
                if (!record.date) return false;
                const recordDate = new Date(record.date);
                recordDate.setHours(0, 0, 0, 0);
                return recordDate.getTime() === today.getTime();
            });
            
            // Sort by session number
            const sortedRecords = todayRecords.sort((a, b) => a.sessionNumber - b.sessionNumber);
            setAllSessions(sortedRecords);
        } catch (error) {
            console.error('Error fetching today sessions:', error);
        }
    };

    const handlePunchIn = async () => {
        if (!currentUser) return;
        
        setLoading(true);
        try {
            const userId = currentUser.id;
            
            const response = await fetch(`http://localhost:8080/api/attendance/punch-in/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', 
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                const error = new Error(data.message || 'Failed to punch in');
                error.response = { data };
                throw error;
            }
            
            setAttendance(data);
            
            // Refresh all sessions after punch in
            fetchAllTodaySessions(userId);
            
            Swal.fire({
                icon: 'success',
                title: 'Punch In Successful',
                text: 'You have successfully punched in for today.',
                background: '#1e262c',
                color: '#2dd4bf',
                confirmButtonColor: '#2dd4bf',
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'rounded-lg shadow-xl',
                    title: 'text-[#2dd4bf]',
                    content: 'text-[#94a3b8]'
                },
                timer: 2000,
                timerProgressBar: true,
                timerProgressBarColor: '#2dd4bf'
            });
        } catch (error) {
            showErrorAlert('Punch In Error', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePunchOut = async () => {
        if (!currentUser) return;
        
        setLoading(true);
        try {
            const userId = currentUser.id;
            const response = await fetch(`http://localhost:8080/api/attendance/punch-out/${userId}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                credentials: 'include' 
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Construct an error with the response data
                const error = new Error(data.message || 'Failed to punch out');
                error.response = { data };
                throw error;
            }
            
            setAttendance(null); // Clear active session since we've punched out
            
            // Refresh all sessions after punch out
            fetchAllTodaySessions(userId);
            
            // Success message with consistent dark theme
            Swal.fire({
                icon: 'success',
                title: 'Punch Out Successful',
                text: 'You have successfully punched out for today.',
                background: '#1e262c',
                color: '#2dd4bf',
                confirmButtonColor: '#2dd4bf',
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'rounded-lg shadow-xl',
                    title: 'text-[#2dd4bf]',
                    content: 'text-[#94a3b8]'
                },
                timer: 2000,
                timerProgressBar: true,
                timerProgressBarColor: '#2dd4bf'
            });
        } catch (error) {
            showErrorAlert('Punch Out Error', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBreak = async () => {
        setLoading(true);
        try {
            const userId = currentUser.id;
            
            const endpoint = isOnBreak 
                ? `http://localhost:8080/api/attendance/break/end/${userId}` 
                : `http://localhost:8080/api/attendance/break/start/${userId}`;
                
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                const error = new Error(data.message || 'Failed to manage break');
                error.response = { data };
                throw error;
            }
            
            // Update the attendance state with the response data
            if (data.attendance) {
                setAttendance(data.attendance);
                // Check if there's an ongoing break (last break has no endTime)
                const hasOngoingBreak = data.attendance.breaks && 
                    data.attendance.breaks.length > 0 && 
                    !data.attendance.breaks[data.attendance.breaks.length - 1].endTime;
                
                setIsOnBreak(hasOngoingBreak);
            } else {
                setAttendance(data);
                
                // Check if there's an ongoing break (last break has no endTime) 
                const hasOngoingBreak = data.breaks && 
                    data.breaks.length > 0 && 
                    !data.breaks[data.breaks.length - 1].endTime;
                
                setIsOnBreak(hasOngoingBreak);
            }
            
            // Refresh all sessions after a break change
            fetchAllTodaySessions(userId);
            
            // Success message
            Swal.fire({
                icon: 'success',
                title: isOnBreak ? 'Break Ended' : 'Break Started',
                text: isOnBreak 
                    ? 'Your break has been ended successfully' 
                    : 'Your break has been started successfully',
                background: '#1e262c',
                color: '#2dd4bf',
                confirmButtonColor: '#2dd4bf',
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'rounded-lg shadow-xl',
                    title: 'text-[#2dd4bf]',
                    content: 'text-[#94a3b8]'
                },
                timer: 2000,
                timerProgressBar: true,
                timerProgressBarColor: '#2dd4bf'
            });
            
        } catch (error) {
            showErrorAlert(isOnBreak ? 'End Break Error' : 'Start Break Error', error);
        } finally {
            setLoading(false);
        }
    };
    
    const formatTime = (date) => {
        if (!date) return 'N/A';
        // Create a date object from the stored time
        const dateObj = new Date(date);
        // Format the time in Tunisia timezone (UTC+1)
        return dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Africa/Tunis' // Use Tunisia timezone instead of UTC
        });
      };

    const getStatus = () => {
        if (!attendance) {
            // Check if we have any completed sessions today
            const completedSessions = allSessions.filter(session => session.checkIn && session.checkOut);
            if (completedSessions.length > 0) return 'Ready for next session';
            return 'Not Checked In';
        }
        if (isOnBreak) return 'On Break';
        return 'Checked In';
    };

    const getStatusColor = () => {
        const status = getStatus();
        switch (status) {
        case 'Checked In': return 'text-[#2dd4bf]';  
        case 'On Break': return 'text-[#E1B382]'; 
        case 'Ready for next session': return 'text-[#94a3b8]';
        case 'Not Checked In': return 'text-[#B2A29E]'; 
        default: return 'text-[#B2A29E]'; 
        }
    };

    return (
        <div className="p-6 space-y-6 bg-[#1a1f23]">
            {/* Main Time Display Card*/}
            <Card className="relative bg-[#1e262c] text-white overflow-hidden border-0 shadow-xl !bg-[#1e262c] !text-white">
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(45,212,191,0.03)_1px,transparent_1px),linear-gradient(rgba(45,212,191,0.03)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="absolute -left-24 top-1/2 -translate-y-1/2 w-48 h-48 bg-[#2dd4bf]/10 rounded-full blur-3xl"></div>
                </div>
                <CardContent className="relative p-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <h2 className="text-5xl font-bold tracking-tight font-mono text-white">
                                {currentTime.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true
                                })}
                            </h2>
                            <p className="text-lg text-[#94a3b8]">
                                {currentTime.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className={`text-xl font-semibold ${getStatusColor()}`}>
                                {getStatus()}
                            </div>
                            {attendance?.status === 'Late' && (
                                <div className="text-red-400 text-sm mt-1">Late by {attendance.lateBy} minutes</div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-4">
                <button
                    onClick={handlePunchIn}
                    disabled={loading || attendance}
                    className={`relative group bg-[#1e262c] rounded-lg p-4 border-0 transition-all duration-300 overflow-hidden ${!attendance ? 'hover:bg-[#2dd4bf]/10' : 'opacity-50 cursor-not-allowed'}`}
                >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(45,212,191,0.03)_1px,transparent_1px),linear-gradient(rgba(45,212,191,0.03)_1px,transparent_1px)] bg-[size:16px_16px]"></div>
                    <div className="relative flex flex-col items-center space-y-2">
                        <Clock className="h-8 w-8 text-[#2dd4bf]" />
                        <span className="font-semibold text-white">Punch In</span>
                    </div>
                </button>

                <button
                    onClick={handleBreak}
                    disabled={loading || !attendance || attendance?.checkOut}
                    className={`relative group bg-[#1e262c] rounded-lg p-4 border-0 transition-all duration-300 overflow-hidden ${attendance && !attendance.checkOut ? 'hover:bg-[#2dd4bf]/10' : 'opacity-50 cursor-not-allowed'}`}
                >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(45,212,191,0.03)_1px,transparent_1px),linear-gradient(rgba(45,212,191,0.03)_1px,transparent_1px)] bg-[size:16px_16px]"></div>
                    <div className="relative flex flex-col items-center space-y-2">
                        <Coffee className="h-8 w-8 text-[#2dd4bf]" />
                        <span className="font-semibold text-white">
                            {isOnBreak ? 'End Break' : 'Start Break'}
                        </span>
                    </div>
                </button>

                <button
                    onClick={handlePunchOut}
                    disabled={loading || !attendance || attendance?.checkOut || isOnBreak}
                    className={`relative group bg-[#1e262c] rounded-lg p-4 border-0 transition-all duration-300 overflow-hidden ${attendance && !attendance.checkOut && !isOnBreak ? 'hover:bg-[#2dd4bf]/10' : 'opacity-50 cursor-not-allowed'}`}
                >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(45,212,191,0.03)_1px,transparent_1px),linear-gradient(rgba(45,212,191,0.03)_1px,transparent_1px)] bg-[size:16px_16px]"></div>
                    <div className="relative flex flex-col items-center space-y-2">
                        <LogOut className="h-8 w-8 text-[#2dd4bf]" />
                        <span className="font-semibold text-white">Punch Out</span>
                    </div>
                </button>
            </div>

            {/* Today's Activity Timeline */}
            <Card className="bg-[#1e262c] border-0 !bg-[#1e262c]">
                <CardHeader>
                    <CardTitle className="text-[#2dd4bf] text-xl">Today's Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {allSessions && allSessions.length > 0 ? (
                        <div className="space-y-6">
                            {allSessions.map((session, sessionIndex) => (
                                <div key={sessionIndex} className="mb-8">
                                    <div className="mb-2">
                                        <h3 className="font-semibold text-[#2dd4bf]">Session {session.sessionNumber}</h3>
                                    </div>
                                    
                                    <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:w-2 before:h-2 before:bg-[#2dd4bf] before:rounded-full before:shadow-[0_0_8px_rgba(45,212,191,0.5)] after:absolute after:left-2.5 after:top-4 after:w-0.5 after:h-full after:bg-[#2dd4bf]/10">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold text-[#2dd4bf]">Punch In</h3>
                                                <p className="text-sm text-[#94a3b8]">{formatTime(session.checkIn)}</p>
                                            </div>
                                            <CheckCircle className="h-5 w-5 text-[#2dd4bf]" />
                                        </div>
                                    </div>

                                    {session.breaks?.map((break_, index) => (
                                        <div key={index} className="relative pl-6 before:absolute before:left-2 before:top-2 before:w-2 before:h-2 before:bg-[#2dd4bf] before:rounded-full before:shadow-[0_0_8px_rgba(45,212,191,0.5)] after:absolute after:left-2.5 after:top-4 after:w-0.5 after:h-full after:bg-[#2dd4bf]/10">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-[#2dd4bf]">Break {index + 1}</h3>
                                                    <p className="text-sm text-[#94a3b8]">
                                                        {formatTime(break_.startTime)} - {break_.endTime ? formatTime(break_.endTime) : 'Ongoing'}
                                                        {break_.duration && ` (${break_.duration} min)`}
                                                    </p>
                                                </div>
                                                <Coffee className="h-5 w-5 text-[#2dd4bf]" />
                                            </div>
                                        </div>
                                    ))}

                                    {session.checkOut && (
                                        <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:w-2 before:h-2 before:bg-[#2dd4bf] before:rounded-full before:shadow-[0_0_8px_rgba(45,212,191,0.5)]">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-[#2dd4bf]">Punch Out</h3>
                                                    <p className="text-sm text-[#94a3b8]">{formatTime(session.checkOut)}</p>
                                                </div>
                                                <LogOut className="h-5 w-5 text-[#2dd4bf]" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-[#94a3b8]">No activity recorded today</div>
                    )}
                </CardContent>
            </Card>
            <AttendanceReports onDataRefresh={() => {
  if (currentUser?.id) {
    fetchTodayAttendance(currentUser.id);
    fetchAllTodaySessions(currentUser.id);
  }
}} />
        </div>
    );
};

export default AttendanceManager;