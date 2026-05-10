export type LoginActionState = {
  error: string | null;
  fieldErrors: {
    email?: string[];
    password?: string[];
  };
  values: {
    email: string;
  };
};

export const initialLoginActionState: LoginActionState = {
  error: null,
  fieldErrors: {},
  values: {
    email: "",
  },
};
