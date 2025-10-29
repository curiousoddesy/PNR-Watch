import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FormField, Textarea, Select, AutoComplete } from '../Form'

describe('FormField', () => {
  it('renders with label', () => {
    render(<FormField label="Test Field" />)
    expect(screen.getByLabelText('Test Field')).toBeInTheDocument()
  })

  it('shows required indicator', () => {
    render(<FormField label="Required Field" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('displays error message', () => {
    render(<FormField label="Field" error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveClass('border-error-300')
  })

  it('displays helper text', () => {
    render(<FormField label="Field" helperText="Enter your information" />)
    expect(screen.getByText('Enter your information')).toBeInTheDocument()
  })

  it('handles input changes', () => {
    const onChange = vi.fn()
    render(<FormField label="Field" onChange={onChange} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test value' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('renders with left and right icons', () => {
    render(
      <FormField 
        label="Field" 
        leftIcon={<span data-testid="left-icon">L</span>}
        rightIcon={<span data-testid="right-icon">R</span>}
      />
    )
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
  })
})

describe('Textarea', () => {
  it('renders with label', () => {
    render(<Textarea label="Message" />)
    expect(screen.getByLabelText('Message')).toBeInTheDocument()
  })

  it('shows required indicator', () => {
    render(<Textarea label="Required Message" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('displays error message', () => {
    render(<Textarea label="Message" error="Message is required" />)
    expect(screen.getByText('Message is required')).toBeInTheDocument()
  })

  it('handles resize options', () => {
    const { rerender } = render(<Textarea resize="none" />)
    expect(screen.getByRole('textbox')).toHaveClass('resize-none')

    rerender(<Textarea resize="vertical" />)
    expect(screen.getByRole('textbox')).toHaveClass('resize-y')

    rerender(<Textarea resize="horizontal" />)
    expect(screen.getByRole('textbox')).toHaveClass('resize-x')

    rerender(<Textarea resize="both" />)
    expect(screen.getByRole('textbox')).toHaveClass('resize')
  })
})

describe('Select', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', disabled: true },
  ]

  it('renders with options', () => {
    render(<Select label="Choose" options={options} />)
    
    expect(screen.getByLabelText('Choose')).toBeInTheDocument()
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.getByText('Option 3')).toBeInTheDocument()
  })

  it('renders placeholder option', () => {
    render(<Select label="Choose" options={options} placeholder="Select an option" />)
    expect(screen.getByText('Select an option')).toBeInTheDocument()
  })

  it('handles disabled options', () => {
    render(<Select label="Choose" options={options} />)
    const option3 = screen.getByText('Option 3') as HTMLOptionElement
    expect(option3.disabled).toBe(true)
  })

  it('handles selection changes', () => {
    const onChange = vi.fn()
    render(<Select label="Choose" options={options} onChange={onChange} />)
    
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'option1' } })
    expect(onChange).toHaveBeenCalled()
  })
})

describe('AutoComplete', () => {
  const options = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
  ]

  it('renders with label', () => {
    render(<AutoComplete label="Fruit" options={options} />)
    expect(screen.getByLabelText('Fruit')).toBeInTheDocument()
  })

  it('shows options when focused and typing', () => {
    render(<AutoComplete label="Fruit" options={options} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'a' } })
    
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.getByText('Banana')).toBeInTheDocument()
  })

  it('filters options based on input', () => {
    render(<AutoComplete label="Fruit" options={options} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'app' } })
    
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.queryByText('Banana')).not.toBeInTheDocument()
    expect(screen.queryByText('Cherry')).not.toBeInTheDocument()
  })

  it('handles option selection', () => {
    const onSelect = vi.fn()
    render(<AutoComplete label="Fruit" options={options} onSelect={onSelect} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'a' } })
    
    const appleOption = screen.getByText('Apple')
    fireEvent.click(appleOption)
    
    expect(onSelect).toHaveBeenCalledWith({ value: 'apple', label: 'Apple' })
  })

  it('calls onChange when input changes', () => {
    const onChange = vi.fn()
    render(<AutoComplete label="Fruit" options={options} onChange={onChange} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })
    
    expect(onChange).toHaveBeenCalledWith('test')
  })
})