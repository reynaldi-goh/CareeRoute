import { StyleSheet } from 'react-native';

export const colors = {
  cardBackground: '#F8F9FA',
  primary: '#3B82F6',
  danger: '#F87171',
  text: '#000000',
  placeholder: '#6B7280',
  white: '#FFFFFF',
};

export const typography = {
  heading: { fontSize: 28, fontWeight: '700', color: colors.text },
  section: { fontSize: 22, fontWeight: '600', color: colors.text },
  normal: { fontSize: 16, fontWeight: '400', color: colors.text },
  caption: { fontSize: 13, fontWeight: '400', color: colors.placeholder },
};

export const radius = 16;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

// Shared primitives reused across screens — cards, inputs, buttons, nav bar
export const shared = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius,
    padding: spacing.md,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
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
  navBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: colors.white,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 13,
    marginTop: 2,
  },
});