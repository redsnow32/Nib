import PropTypes from "prop-types";
import React, { useEffect, useState, useRef } from "react";
import { EditorView } from "prosemirror-view";

import getPluginStyles from "../../utils/editor/styles";
import { buildEditorState, updateEditorState } from "../../utils/editor/state";
import { getPluginList } from "../../utils/editor/plugins";
import { useConfigContext } from "../../context/config";
import { usePMStateContext } from "../../context/pm-state";

import { StyledEditor } from "./styles";

const Editor = ({
  addons,
  autoFocus,
  defaultValue,
  onBlur,
  onChange,
  spellCheck
}) => {
  const editorRef = useRef(null);
  const {
    config: { plugins },
    dispatcher
  } = useConfigContext();
  const pmstate = usePMStateContext();
  let [view] = useState();
  const viewProvider = () => view;

  const updateViewListeners = () => {
    dispatcher.dispatch(view);
    addons.forEach(addon => {
      addon.viewUpdateCallback(view);
    });
  };

  useEffect(() => {
    const pluginList = getPluginList(
      `${plugins.options} history common`
    ).concat(addons);
    const state = buildEditorState(pluginList, defaultValue, viewProvider);
    view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction: tr => {
        let editorState = view.state.apply(tr);

        addons.forEach(addon => {
          if (addon.dispatchTransactionCallback)
            editorState = addon.dispatchTransactionCallback(editorState, tr);
        });

        updateEditorState(view, editorState);
        updateViewListeners();
        const serializableState = view.state.toJSON();
        addons.forEach(addon => {
          const { name, getSerializableState } = addon;
          if (getSerializableState)
            serializableState[name] = getSerializableState();
        });
        if (onChange) onChange(serializableState);
      },
      props: { onBlur }
    });
    if (autoFocus) {
      view.focus();
    }
    addons.forEach(addon => {
      if (addon.createStateFromDoc)
        addon.createStateFromDoc(doc => {
          const editorState = buildEditorState(pluginList, doc);
          view.updateState(editorState);
        });
    });
    updateViewListeners();
    return () => view.destroy();
  }, []);

  return (
    <StyledEditor
      // eslint-disable-next-line react/prop-types
      onClick={() => pmstate.pmview.focus()}
      pluginStyles={getPluginStyles(plugins.options, addons)}
      ref={editorRef}
      spellCheck={spellCheck}
    />
  );
};

Editor.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  addons: PropTypes.array,
  autoFocus: PropTypes.bool,
  // eslint-disable-next-line react/forbid-prop-types
  defaultValue: PropTypes.object,
  onBlur: PropTypes.func,
  onChange: PropTypes.func,
  spellCheck: PropTypes.bool
};

Editor.defaultProps = {
  addons: [],
  autoFocus: false,
  defaultValue: undefined,
  onBlur: () => {},
  onChange: () => {},
  spellCheck: false
};

export default Editor;
