import React, { useState, useCallback, useMemo } from 'react';

interface FormData {
  name: string;
  email: string;
  age: number;
}

interface TestFormProps {
  onSubmit: (data: FormData) => void;
  initialData?: Partial<FormData>;
}

const TestForm: React.FC<TestFormProps> = ({ onSubmit, initialData = {} }) => {
  const [formData, setFormData] = useState<FormData>({
    name: initialData.name || '',
    email: initialData.email || '',
    age: initialData.age || 0
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation logic
  const validateField = useCallback((field: keyof FormData, value: any) => {
    switch (field) {
      case 'name':
        return value.length < 2 ? 'Name must be at least 2 characters' : '';
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? 'Invalid email format' : '';
      case 'age':
        return value < 18 ? 'Age must be at least 18' : '';
      default:
        return '';
    }
  }, []);

  // Debounced validation
  const debouncedValidation = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (field: keyof FormData, value: any) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error || undefined }));
      }, 300);
    };
  }, [validateField]);

  // Handle input changes
  const handleInputChange = useCallback((field: keyof FormData) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === 'age' ? parseInt(event.target.value) || 0 : event.target.value;
      
      setFormData(prev => ({ ...prev, [field]: value }));
      debouncedValidation(field, value);
    };
  }, [debouncedValidation]);

  // Calculate form completion percentage
  const completionPercentage = useMemo(() => {
    const fields = Object.values(formData);
    const completedFields = fields.filter(value => 
      typeof value === 'string' ? value.trim() !== '' : value > 0
    ).length;
    return Math.round((completedFields / fields.length) * 100);
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    // Validate all fields
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    Object.keys(formData).forEach(key => {
      const field = key as keyof FormData;
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        await onSubmit(formData);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }

    setIsSubmitting(false);
  }, [formData, validateField, onSubmit]);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Test Form</h2>
      
      {/* Progress indicator */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Completion</span>
          <span>{completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={handleInputChange('name')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your name"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Email field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your email"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        {/* Age field */}
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
            Age
          </label>
          <input
            type="number"
            id="age"
            value={formData.age || ''}
            onChange={handleInputChange('age')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.age ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your age"
            min="0"
          />
          {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || completionPercentage < 100}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            isSubmitting || completionPercentage < 100
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
          } text-white`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Form'}
        </button>
      </form>
    </div>
  );
};

export default TestForm;