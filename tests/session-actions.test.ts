import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string; role: string },
  signOut: vi.fn(), push: vi.fn(), replace: vi.fn(),
  buttons: [] as { title: string; onPress: () => void | Promise<void>; disabled?: boolean }[],
}));
vi.mock('react-native', () => ({ View: 'div' }));
vi.mock('expo-router', () => ({ router: { push: mocks.push, replace: mocks.replace } }));
vi.mock('@/lib/market-context', () => ({ useMarket: () => ({ user: mocks.user, signOut: mocks.signOut }) }));
vi.mock('../components/market/ui', () => ({
  row: {},
  ErrorText: () => null,
  Button: (props: any) => { mocks.buttons.push(props); return React.createElement('button', { disabled: props.disabled }, props.title); },
}));
import { SessionActions } from '../components/market/session-actions';

beforeEach(() => {
  mocks.user = null; mocks.buttons.length = 0;
  mocks.signOut.mockReset(); mocks.push.mockReset(); mocks.replace.mockReset();
});
function render(props: React.ComponentProps<typeof SessionActions>) { return renderToStaticMarkup(React.createElement(SessionActions, props)); }
function button(title: string) { const result = mocks.buttons.find(item => item.title === title); expect(result).toBeDefined(); return result!; }

describe('visible session and page navigation', () => {
  it('shows login for visitors and navigates to the independent login screen', () => {
    const html = render({ home: true, personal: true, logout: true });
    expect(html).toContain('تسجيل الدخول'); expect(html).not.toContain('تسجيل الخروج');
    button('تسجيل الدخول').onPress(); expect(mocks.push).toHaveBeenCalledWith('/login');
  });
  it('shows the personal-page action and logout for either a user or an administrator', () => {
    for (const role of ['user', 'admin']) {
      mocks.user = { id: 'unit-test', role }; mocks.buttons.length = 0;
      const html = render({ personal: true, logout: true });
      expect(html).toContain('صفحتي الشخصية'); expect(html).toContain('تسجيل الخروج');
      button('صفحتي الشخصية').onPress(); expect(mocks.push).toHaveBeenCalledWith('/account');
    }
  });
  it('returns to home without invoking logout or publication', () => {
    render({ home: true }); button('الرئيسية').onPress();
    expect(mocks.replace).toHaveBeenCalledWith('/'); expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('waits for remote session termination before navigating home', async () => {
    mocks.user = { id: 'unit-test', role: 'admin' };
    let finish!: () => void;
    mocks.signOut.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    render({ logout: true }); const result = button('تسجيل الخروج').onPress();
    expect(mocks.signOut).toHaveBeenCalledOnce(); expect(mocks.replace).not.toHaveBeenCalled();
    finish(); await result; expect(mocks.replace).toHaveBeenCalledWith('/');
  });
  it('does not redirect if logout fails', async () => {
    mocks.user = { id: 'unit-test', role: 'user' };
    mocks.signOut.mockRejectedValue(new Error('mock offline'));
    render({ logout: true }); await button('تسجيل الخروج').onPress();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it('disables departure actions during a running upload', () => {
    render({ home: true, personal: true, disabled: true });
    expect(button('الرئيسية').disabled).toBe(true); expect(button('تسجيل الدخول').disabled).toBe(true);
  });
});
