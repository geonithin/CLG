import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { useState } from 'react';

import { requireAdmin } from '~/lib/session.server';
import { supabase } from '~/lib/supabase.server';

export const meta: MetaFunction = () => [{ title: 'Homework Management - Admin Dashboard' }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAdmin(request);

  const { data: homework, error } = await supabase
    .from('homework')
    .select('*')
    .order('homework_date', { ascending: false });

  if (error) {
    console.error('Error fetching homework:', error);
  }

  return json({ homework: homework || [] });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'create') {
    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string;
    const homeworkDate = formData.get('assignedDate') as string;

    // Validate required fields
    if (!subject || !description || !homeworkDate) {
      return json({ error: 'All fields are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('homework')
      .insert({
        subject,
        description,
        homework_date: homeworkDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating homework:', error);
      return json({ error: error.message }, { status: 400 });
    }

    return redirect('/admin/homework');
  }

  if (intent === 'update') {
    const homeworkId = formData.get('homeworkId') as string;
    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string;
    const homeworkDate = formData.get('assignedDate') as string;

    if (!homeworkId || !subject || !description || !homeworkDate) {
      return json({ error: 'All fields are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('homework')
      .update({
        subject,
        description,
        homework_date: homeworkDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', homeworkId);

    if (error) {
      console.error('Error updating homework:', error);
      return json({ error: error.message }, { status: 400 });
    }

    return redirect('/admin/homework');
  }

  if (intent === 'delete') {
    const homeworkId = formData.get('homeworkId') as string;
    
    const { error } = await supabase
      .from('homework')
      .delete()
      .eq('id', homeworkId);

    if (error) {
      console.error('Error deleting homework:', error);
      return json({ error: error.message }, { status: 400 });
    }

    return redirect('/admin/homework');
  }

  // No status column in homework table anymore, so remove status update logic

  return json({ error: 'Invalid action' }, { status: 400 });
};

export default function HomeworkManagement() {
  const { homework } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingHomework, setEditingHomework] = useState<any>(null);

  const isSubmitting = navigation.state === 'submitting';

  // Helper function to format date intelligently
  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    const tomorrow = new Date(today);
    
    yesterday.setDate(today.getDate() - 1);
    tomorrow.setDate(today.getDate() + 1);
    
    // Reset time to compare dates only
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    
    if (dateOnly.getTime() === todayOnly.getTime()) {
      return "Today";
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return "Yesterday";
    } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTodaysHomework = () => {
    const today = new Date().toISOString().split('T')[0];
    return homework.filter(hw => hw.homework_date === today);
  };

  const getHomeworkByDate = (date: string) => {
    return homework.filter(hw => hw.homework_date === date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100 dark:from-slate-900 dark:via-green-900/20 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg dark:bg-slate-900/80 shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link 
                to="/admin" 
                className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                title="Back to Dashboard"
              >
                <svg className="w-5 h-5 mr-0 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                📚 Daily Homework
              </h1>
            </div>
            
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Assign Homework
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/70 backdrop-blur-lg dark:bg-slate-800/70 rounded-xl shadow-lg border border-white/20 p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-500">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Tasks</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{getTodaysHomework().length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-lg dark:bg-slate-800/70 rounded-xl shadow-lg border border-white/20 p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-blue-500">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Assigned</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{homework.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-lg dark:bg-slate-800/70 rounded-xl shadow-lg border border-white/20 p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-yellow-500">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {homework.filter(hw => hw.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-lg dark:bg-slate-800/70 rounded-xl shadow-lg border border-white/20 p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-500">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {homework.filter(hw => hw.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Create/Edit Homework Form */}
        {(showForm || editingHomework) && (
          <div className="mb-8 bg-white/70 backdrop-blur-lg dark:bg-slate-800/70 rounded-2xl shadow-xl border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{editingHomework ? 'Edit Homework' : 'Assign New Homework'}</h2>
            <Form method="post" className="space-y-6">
              <input type="hidden" name="intent" value={editingHomework ? 'update' : 'create'} />
              {editingHomework && (
                <input type="hidden" name="homeworkId" value={editingHomework.id} />
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    defaultValue={editingHomework ? editingHomework.subject : ''}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-900 dark:text-white"
                    placeholder="Enter subject name..."
                  />
                </div>
                <div>
                  <label htmlFor="assignedDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    id="assignedDate"
                    name="assignedDate"
                    required
                    defaultValue={editingHomework ? editingHomework.homework_date : new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  required
                  defaultValue={editingHomework ? editingHomework.description : ''}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-900 dark:text-white"
                  placeholder="Enter homework description and instructions..."
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingHomework(null); }}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 disabled:opacity-50"
                >
                  {isSubmitting ? (editingHomework ? 'Updating...' : 'Assigning...') : (editingHomework ? 'Update Homework' : 'Assign Homework')}
                </button>
              </div>
            </Form>
            {actionData?.error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400">{actionData.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Date Filter and Homework List */}
        <div className="bg-white/70 backdrop-blur-lg dark:bg-slate-800/70 rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Homework Calendar</h2>
            <div className="flex items-center space-x-4">
              <label htmlFor="dateFilter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by date:
              </label>
              <input
                type="date"
                id="dateFilter"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 dark:bg-slate-800/50 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {homework.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No homework assigned yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Start assigning daily homework with subjects and descriptions.</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                Assign First Homework
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {getHomeworkByDate(selectedDate).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">No homework assigned for {new Date(selectedDate).toLocaleDateString()}</p>
                </div>
              ) : (
                getHomeworkByDate(selectedDate).map((hw) => (
                  <div key={hw.id} className="bg-white/50 dark:bg-slate-700/50 rounded-xl p-6 border border-white/20 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                            {hw.subject}
                          </span>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {formatDateDisplay(hw.homework_date)}
                          </span>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                          {hw.description}
                        </p>

                        <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Created: {new Date(hw.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                            {/* Status Update Dropdown removed, no status column in homework table */}
                        <button
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit homework"
                          onClick={() => {
                            setEditingHomework(hw);
                            setShowForm(false);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        <Form method="post" className="inline">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="homeworkId" value={hw.id} />
                          <button 
                            type="submit"
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete homework"
                            onClick={(e) => {
                              if (!confirm('Are you sure you want to delete this homework?')) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </Form>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
