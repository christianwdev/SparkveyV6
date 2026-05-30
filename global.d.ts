import type GlobalObject from 'types/GlobalObject';
import type * as React from 'react';

// TS doesn't like you overwriting the global object, so we're just gonna add a variable to it
declare global {

  var globalObject: GlobalObject;

  namespace JSX {
    interface IntrinsicElements {
      'emoji-picker': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

export {};
