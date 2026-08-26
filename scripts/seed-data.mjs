export const defaultFields = [
  { label: 'First Name', type: 'text', required: 1 },
  { label: 'Last Name', type: 'text', required: 1 },
  { label: 'School Email', type: 'email', required: 1, placeholder: 'you@school.edu' },
  { label: 'Grade Level', type: 'select', required: 1, options: ['9', '10', '11', '12'] },
  { label: 'Phone Number', type: 'tel', required: 0, placeholder: '(555) 555-5555' },
  {
    label: 'Areas of Interest',
    type: 'checkbox-group',
    required: 0,
    options: [
      'Marketing',
      'Finance',
      'Business Management',
      'Entrepreneurship',
      'Hospitality & Tourism',
      'Sports & Entertainment Marketing'
    ]
  },
  {
    label: 'How did you hear about us?',
    type: 'select',
    required: 0,
    options: ['Friend', 'Teacher', 'Morning Announcements', 'Social Media', 'Club Fair', 'Other']
  },
  { label: 'Questions or Comments', type: 'textarea', required: 0 }
];
