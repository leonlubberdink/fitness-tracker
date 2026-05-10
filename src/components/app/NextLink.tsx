"use client";

import Link, { type LinkProps } from "next/link";
import { forwardRef } from "react";
import type { AnchorHTMLAttributes } from "react";

type NextLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

const NextLink = forwardRef<HTMLAnchorElement, NextLinkProps>(function NextLink(
  props,
  ref,
) {
  return <Link ref={ref} {...props} />;
});

export default NextLink;
