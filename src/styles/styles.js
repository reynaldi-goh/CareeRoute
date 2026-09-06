import { StyleSheet } from 'react-native';

// base color palette used across the whole app
export const colors = {
  cardBackground: '#F8F9FA',
  primary: '#3B82F6',
  danger: '#F87171',
  text: '#000000',
  placeholder: '#6B7280',
  white: '#FFFFFF',
};

// reusable text styles — heading > section > normal > caption, in visual weight
export const typography = {
  heading: { fontSize: 28, fontWeight: '700', color: colors.text },
  section: { fontSize: 22, fontWeight: '600', color: colors.text },
  normal: { fontSize: 16, fontWeight: '400', color: colors.text },
  caption: { fontSize: 13, fontWeight: '400', color: colors.placeholder },
};

// shared corner radius for cards/inputs/buttons, keeps the app visually consistent
export const radius = 16;

// spacing scale, use instead of hardcoded margin/padding numbers
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

// shared primitives reused across screens — cards, inputs, buttons, nav bar
export const shared = StyleSheet.create({
  // base full-screen wrapper, used as the outer style on every screen
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // generic content container (info cards, stage cards, etc.)
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius,
    padding: spacing.md,
  },

  // text input styling shared by all form fields
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },

  // main call-to-action button
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // destructive action button (remove roadmap, delete account, etc.)
  dangerButton: {
    backgroundColor: colors.danger,
    borderRadius: radius,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // bottom tab bar container
  navBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: colors.white,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  // single tab within the nav bar
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 13,
    marginTop: 2,
  },
});