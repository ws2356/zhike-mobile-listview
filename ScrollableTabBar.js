// @flow

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import _ from 'lodash';
const { width:ScreenW } = Dimensions.get('window');

export default class ScrollableTabBar extends Component {
  constructor(props) {
    super(props);
    this.state = { scrollItemLayoutInfos:[] };
    this.offsetX = 0;
  }

  componentWillReceiveProps(nextProps) {
    const nextTab = (nextProps && nextProps.activeTab) || 0;
    if (this._currentItem != nextTab) {
      this._currentItem = nextTab;
      const beyond = this._itemBeyondScreen(nextTab);
      if (beyond > 0) {
        const newOffset = this._offsetForItemToDockRight(nextTab);
        this.refs.scrollView.scrollTo({ y:0, x:newOffset }, true);
      } else if (beyond < 0) {
        const newOffset = this._offsetForItemToDockLeft(nextTab);
        this.refs.scrollView.scrollTo({ y:0, x:newOffset }, true);
      }
    }
  }

/**
 * if item beyond screen
 * @param  {[type]} index [description]
 * @return {[type]}       [description]
 */
  _itemBeyondScreen(index) {
    const layout = this.scrollItemLayoutInfos[index];
    if (layout) {
      const offsetRight = layout.x + layout.width - this.offsetX - ScreenW;
      if (offsetRight > 0) {
        return offsetRight;
      }
      const offsetLeft = layout.x - this.offsetX;
      if (offsetLeft < 0) {
        return offsetLeft;
      }
    }
    return 0;
  }

  _offsetForItemToDockLeft(index) {
    return this.scrollItemLayoutInfos[index].x;
  }

  _offsetForItemToDockRight(index) {
    const w = this.scrollItemLayoutInfos[index].width;
    let ret = this._offsetForItemToDockLeft(index);
    if (w < ScreenW) {
      ret -= (ScreenW - w);
    }
    return ret;
  }

  renderTabOption(name, page, pageCount, passProps) {
    const isTabActive = this.props.activeTab === page;

    return (<TouchableOpacity
      style={{ height:50, alignItems:'center', justifyContent:'center', marginLeft: 22, marginRight: page == pageCount - 1 ? 22 : 38 }}
      key={name}
      accessible={true}
      accessibilityLabel={name}
      accessibilityTraits="button"
      onPress={() => this.props.goToPage(page)}
      {...passProps}
    >
      {this.renderTabName(name, page, isTabActive)}
    </TouchableOpacity>);
  }

  renderTabName(name, page, isTabActive) {
    const { activeTextColor, inactiveTextColor, textStyle, } = this.props;
    const textColor = isTabActive ? activeTextColor : inactiveTextColor;
    const fontWeight = isTabActive ? 'bold' : 'normal';

    return (<View style={[styles.tab, this.props.tabStyle, { alignItems:'center', justifyContent:'center' }]}>
      <Text style={[{ color: textColor, fontWeight, }, textStyle,]}>
        {name}
      </Text>
    </View>);
  }

  _onLayoutTabItem(index, size) {
    if (size) {
      const arr = this.scrollItemLayoutInfos;
      arr[index] = size;
      this.scrollItemLayoutInfos = arr;
    }
  }

  get scrollItemLayoutInfos() {
    return this.state.scrollItemLayoutInfos;
  }

  set scrollItemLayoutInfos(arr) {
    this.setState({ scrollItemLayoutInfos:arr });
  }

  render() {
    const containerWidth = this.props.containerWidth;
    const numberOfTabs = this.props.tabs.length;

    let currentItemLayout = this.scrollItemLayoutInfos[this.props.activeTab];
    if (!currentItemLayout) {
      currentItemLayout = { x: 0, width: 0 };
    }
    const tabUnderlineStyle = {
      position: 'absolute',
      left: currentItemLayout.x,
      width: currentItemLayout.width,
      height: this.props.underlineHeight,
      backgroundColor: this.props.underlineColor,
      bottom: 0,
    };

    return (
      <View>
        <ScrollView
          ref={'scrollView'}
          style={[styles.tabs, { backgroundColor: this.props.backgroundColor, }, this.props.style, { height:50 }]}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          horizontal
          contentContainerStyle={{ alignItems:'center' }}
          onScroll={this._onScroll.bind(this)}
        >
          <View style={{ flexDirection:'row' }}>
            {
              this.props.tabs.map(
                (tab, i) => this.renderTabOption(
                  tab, i, this.props.tabs.length, { onLayout:e => this._onLayoutTabItem(i, e && e.nativeEvent && e.nativeEvent.layout) }
                )
              )
            }
            <View style={tabUnderlineStyle} />
          </View>
        </ScrollView>
      </View>
    );
  }

  _onScroll(e) {
    const offset = e.nativeEvent.contentOffset;
    this.offsetX = offset.x;
  }

}

ScrollableTabBar.propTypes = {
  goToPage: PropTypes.func,
  activeTab: PropTypes.number,
  tabs: PropTypes.array,
  underlineColor: PropTypes.string,
  underlineHeight: PropTypes.number,
  backgroundColor: PropTypes.string,
  activeTextColor: PropTypes.string,
  inactiveTextColor: PropTypes.string,
  textStyle: Text.propTypes.style,
  tabStyle: View.propTypes.style,
};

ScrollableTabBar.defaultProps = {
  activeTextColor: 'navy',
  inactiveTextColor: 'black',
  underlineColor: 'navy',
  backgroundColor: null,
  underlineHeight: 4,
};

const styles = StyleSheet.create({
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  tabs: {
    height: 50,
    borderWidth: 1,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomColor: '#ccc',
  },
});
