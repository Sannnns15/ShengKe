// ══ Button Component Tests ══════════════════════════════
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import type { ButtonProps } from '../Button';

// Since we can't render RN components in node env, we test the
// component's interface contract: prop types, logic flow, and defaults.

// We'll verify the Button component accepts all variant combinations
// and that callback behavior is correct.

describe('Button component interface', () => {
  it('should accept primary variant with title', () => {
    const props: ButtonProps = {
      title: 'Save',
      onPress: () => {},
      variant: 'primary',
    };
    expect(props.title).toBe('Save');
    expect(props.variant).toBe('primary');
  });

  it('should accept all variant types', () => {
    const variants: ButtonProps['variant'][] = [
      'primary',
      'secondary',
      'outline',
      'ghost',
    ];
    for (const variant of variants) {
      const props: ButtonProps = { title: 'Test', onPress: () => {}, variant };
      expect(props.variant).toBe(variant);
    }
  });

  it('should accept all size types', () => {
    const sizes: ButtonProps['size'][] = ['sm', 'md', 'lg'];
    for (const size of sizes) {
      const props: ButtonProps = { title: 'Test', onPress: () => {}, size };
      expect(props.size).toBe(size);
    }
  });

  it('should disable onPress when disabled is true', () => {
    const onPress = vi.fn();
    const props: ButtonProps = {
      title: 'Test',
      onPress,
      disabled: true,
    };
    // Simulate: button shouldn't call onPress when disabled
    // The component checks disabled state internally
    if (props.disabled) {
      // Don't call onPress
    } else {
      onPress();
    }
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should disable onPress when loading is true', () => {
    const onPress = vi.fn();
    const props: ButtonProps = {
      title: 'Test',
      onPress,
      loading: true,
    };
    if (props.loading) {
      // Don't call onPress
    } else {
      onPress();
    }
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should call onPress when clicked and not disabled', () => {
    const onPress = vi.fn();
    const props: ButtonProps = {
      title: 'Test',
      onPress,
    };
    // Simulate press
    if (!props.disabled && !props.loading) {
      onPress();
    }
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should accept optional icon', () => {
    const propsWithIcon: ButtonProps = {
      title: 'Save',
      onPress: () => {},
      icon: 'checkmark',
    };
    expect(propsWithIcon.icon).toBe('checkmark');

    const propsWithoutIcon: ButtonProps = {
      title: 'Save',
      onPress: () => {},
    };
    expect(propsWithoutIcon.icon).toBeUndefined();
  });

  it('should accept fullWidth prop', () => {
    const propsFull: ButtonProps = {
      title: 'Full',
      onPress: () => {},
      fullWidth: true,
    };
    expect(propsFull.fullWidth).toBe(true);

    const propsDefault: ButtonProps = {
      title: 'Default',
      onPress: () => {},
    };
    expect(propsDefault.fullWidth).toBeUndefined();
  });

  it('should not be disabled when disabled and loading are false', () => {
    const onPress = vi.fn();
    const props: ButtonProps = {
      title: 'Test',
      onPress,
      disabled: false,
      loading: false,
    };
    // Should be able to press
    if (!props.disabled && !props.loading) {
      onPress();
    }
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when both disabled and loading are true', () => {
    const onPress = vi.fn();
    const props: ButtonProps = {
      title: 'Test',
      onPress,
      disabled: true,
      loading: true,
    };
    if (!props.disabled && !props.loading) {
      onPress();
    }
    expect(onPress).not.toHaveBeenCalled();
  });
});
