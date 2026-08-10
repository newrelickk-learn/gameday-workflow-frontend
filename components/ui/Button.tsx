import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@mui/material';

interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  const muiVariant = variant === 'primary' ? 'contained' : variant === 'danger' ? 'contained' : 'outlined';
  const color = variant === 'danger' ? 'error' : variant === 'primary' ? 'primary' : 'inherit';

  return (
    <MuiButton variant={muiVariant} color={color} {...props}>
      {children}
    </MuiButton>
  );
}
