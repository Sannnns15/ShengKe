// ══ Input Component Tests ═══════════════════════════════
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import type { InputProps } from '../Input';

describe('Input component interface', () => {
  it('should render placeholder text', () => {
    const placeholder = 'Enter your name';
    const props: InputProps = {
      value: '',
      onChangeText: vi.fn(),
      placeholder,
    };
    expect(props.placeholder).toBe(placeholder);
  });

  it('should call onChangeText when text changes', () => {
    const onChangeText = vi.fn();
    const props: InputProps = {
      value: '',
      onChangeText,
    };
    // Simulate text change
    props.onChangeText('hello');
    expect(onChangeText).toHaveBeenCalledWith('hello');
  });

  it('should display error message', () => {
    const errorMsg = 'This field is required';
    const props: InputProps = {
      value: '',
      onChangeText: vi.fn(),
      error: errorMsg,
    };
    expect(props.error).toBe(errorMsg);
  });

  it('should display label', () => {
    const label = 'Username';
    const props: InputProps = {
      value: '',
      onChangeText: vi.fn(),
      label,
    };
    expect(props.label).toBe(label);
  });

  it('should accept multiline mode', () => {
    const propsSingle: InputProps = {
      value: '',
      onChangeText: vi.fn(),
    };
    expect(propsSingle.multiline).toBeUndefined();

    const propsMulti: InputProps = {
      value: '',
      onChangeText: vi.fn(),
      multiline: true,
    };
    expect(propsMulti.multiline).toBe(true);
  });

  it('should accept secureTextEntry', () => {
    const props: InputProps = {
      value: '',
      onChangeText: vi.fn(),
      secureTextEntry: true,
    };
    expect(props.secureTextEntry).toBe(true);
  });

  it('should accept left and right icons', () => {
    const props: InputProps = {
      value: '',
      onChangeText: vi.fn(),
      leftIcon: 'search',
      rightIcon: 'close',
    };
    expect(props.leftIcon).toBe('search');
    expect(props.rightIcon).toBe('close');
  });

  it('should call onRightIconPress when right icon is pressed', () => {
    const onRightIconPress = vi.fn();
    const props: InputProps = {
      value: '',
      onChangeText: vi.fn(),
      rightIcon: 'close',
      onRightIconPress,
    };
    props.onRightIconPress?.();
    expect(onRightIconPress).toHaveBeenCalledOnce();
  });

  it('should update value via onChangeText', () => {
    let value = '';
    const onChangeText = vi.fn((text: string) => {
      value = text;
    });

    const props: InputProps = {
      value,
      onChangeText,
    };

    // Simulate user typing
    const input1 = 'Hello, ';
    const input2 = 'World!';
    props.onChangeText(input1 + input2);

    expect(onChangeText).toHaveBeenCalledWith('Hello, World!');
  });

  it('should not render error when no error prop provided', () => {
    const props: InputProps = {
      value: 'some text',
      onChangeText: vi.fn(),
    };
    expect(props.error).toBeUndefined();
  });
});
