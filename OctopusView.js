

import React, {
  PropTypes,
  Component
} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import _ from 'underscore';
import Perf from 'react-addons-perf';
import shallowCompare from 'react-addons-shallow-compare';

const { width:ScreenW, height:ScreenH } = Dimensions.get('window');

export default class OctopusView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      scrollY: new Animated.Value(0),
      headerLayoutHeight:0,
      headerHiddenPartLayoutHeight:0,
    };

    this._pageContentLayoutInfo = [];
    this._vScrollables = [];

    this._scrollDests = {};
  }

  componentWillReceiveProps(nextProps) {
    const visiblePage = (nextProps && nextProps.visiblePage) || 0;
    if (this.getCurrentScrollableIndex() !== visiblePage) {
      this.setCurrentScrollableIndex(visiblePage);
      this._pauseSetCurrentScrollableIndex = true;
      this._hScroll && this._hScroll.scrollTo({ x:this.getCurrentScrollableIndex() * ScreenW });
    }
    if (visiblePage !== this.props.visiblePage) {
      this._headerRef && this._headerRef.forceRender(visiblePage);
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps && nextProps.visiblePage !== this.props.visiblePage) {
      // because this kind of change is already handled in componentWillReceiveProps
      // and no other props change simutaneously with this prop
      return false;
    }
    const ret = shallowCompare(this, nextProps, nextState);
    return ret;
  }

  setCurrentScrollableIndex(index) {
    if (this._pauseSetCurrentScrollableIndex) {
      return;
    }
    if (index !== this.getCurrentScrollableIndex()) {
      this._handlePageChange(this.getCurrentScrollableIndex(), index);
      this.props && this.props.onPageChange && this.props.onPageChange(index);
    }
    this._currentScrollableIndex = index;
  }

  getCurrentScrollableIndex() {
    return this._currentScrollableIndex || 0;
  }

  get headerLayoutHeight() {
    return this.state.headerLayoutHeight;
  }

  get headerHiddenPartLayoutHeight() {
    if (this.state.headerHiddenPartLayoutHeight > 0) {
      return this.state.headerHiddenPartLayoutHeight;
    } else {
      return this.headerLayoutHeight;
    }
  }

  _handlePageChange(oldIndex, newIndex) {
    if (!this._verticalScrollPos) {
      console.error('initial scroll value not set up, not supposed to happen!!!');
      return;
    }
    const defaultContentHeight = this._defaultPageContentHeight();
    const scrollYInputRange = this.scrollYInputRange;

    const currentVerticalScroll = this._verticalScrollPos[oldIndex];
    const contentHeight = this._getPageContentHeight(newIndex);

    const maxPossibleScrollY = scrollYInputRange[0] + Math.max(0, contentHeight - defaultContentHeight);
    const updateCurrentScrollY = Math.min(maxPossibleScrollY, currentVerticalScroll, scrollYInputRange[1]);
    const newScrollable = this._vScrollables[newIndex];
    if (newScrollable) {
      if (currentVerticalScroll < scrollYInputRange[1] || this._verticalScrollPos[newIndex] < scrollYInputRange[1]) {
        Perf.start();
        this._perfIndex = newIndex;
        this._scrollDests[newIndex] = updateCurrentScrollY;
        newScrollable.scrollTo({ y:updateCurrentScrollY - 1 });
        newScrollable.scrollTo({ y:updateCurrentScrollY });
      }
    } else if (!newScrollable) {
      console.error('no ref to horizontal scrollable at index: ', newIndex);
    }
  }

  _scrollExtend(scrollIndex) {
    const defaultContentHeight = this._defaultPageContentHeight();
    const scrollYInputRange = this.scrollYInputRange;
    const contentHeight = this._getPageContentHeight(scrollIndex);
    const maxPossibleScrollY = scrollYInputRange[0] + Math.max(0, contentHeight - defaultContentHeight);
    const minPossibleScrollY = scrollYInputRange[0];
    return [minPossibleScrollY, maxPossibleScrollY];
  }

  _isScrollYInRange(scrollY, scrollIndex) {
    const [minPossibleScrollY, maxPossibleScrollY] = this._scrollExtend(scrollIndex);
    return scrollY >= minPossibleScrollY && scrollY <= maxPossibleScrollY;
  }

  _isContentSmall(scrollIndex) {
    const contentHeight = this._getPageContentHeight(scrollIndex);
    const defaultContentHeight = this._defaultPageContentHeight();
    const inputRange = this.scrollYInputRange[1] - this.scrollYInputRange[0];
    return (
      typeof contentHeight === 'number' &&
      typeof inputRange === 'number' &&
      contentHeight < inputRange
    );
  }

  _tryScrollTo(scrollY, scrollIndex) {
    const newScrollable = this._vScrollables[scrollIndex];
    if (!newScrollable) {
      return;
    }
    const [sMin, sMax] = this._scrollExtend(scrollIndex);
    newScrollable.scrollTo({
      animated:false,
      y:Math.max(sMin, Math.min(sMax, scrollY))
    });
  }

  _onHeaderLayout(e, relayCallback) {
    // assumption: the value of e dont change too much, and this method is called only before user interaction
    let height = 0;
    e && e.nativeEvent && e.nativeEvent.layout && Object.prototype.hasOwnProperty.call(e.nativeEvent.layout, 'height') &&
    (height = e.nativeEvent.layout.height);
    if (this.state.headerLayoutHeight !== height) {
      this._setupVerticalScrollTable();
      this.setState(
        { headerLayoutHeight:height },
        () => {
          this._resetFirstPagePositionAndAnimatedValue();
          this._animatedValueRef();
        }
      );
    }
    relayCallback && relayCallback(e);
  }

  _onHeaderHiddenPartLayout(e) {
    // assumption: the value of e dont change too much, and this method is called only before user interaction
    let height = 0;
    e && e.nativeEvent && e.nativeEvent.layout && Object.prototype.hasOwnProperty.call(e.nativeEvent.layout, 'height') &&
    (height = e.nativeEvent.layout.height);
    if (this.state.headerHiddenPartLayoutHeight !== height) {
      this._setupVerticalScrollTable();
      this.setState(
        { headerHiddenPartLayoutHeight:height },
        () => this._animatedValueRef()
      );
    }
  }

  _resetFirstPagePositionAndAnimatedValue() {
    this._vScrollables[0] && this._vScrollables[0].scrollTo({
      y: this.scrollYInputRange[0],
      animated:false,
    });
    this._verticalScrollPos[0] = this.scrollYInputRange[0];
    this.state.scrollY.setValue(this.scrollYInputRange[0]);
  }

  _animatedValueRef() {
    const scrollYRange = [...this.scrollYInputRange];
    if (!scrollYRange || Number.isNaN(scrollYRange[0]) || Number.isNaN(scrollYRange[1])) {
      return;
    }
    this.props && this.props.getHeaderScrollAnimValue && this.props.getHeaderScrollAnimValue(
      (fadeLength) => {
        scrollYRange[0] = scrollYRange[1] - fadeLength;
        return this.state.scrollY.interpolate({
          inputRange: scrollYRange,
          outputRange: [-fadeLength, 0],
        });
      }
    );
  }

  _setupVerticalScrollTable() {
    this._verticalScrollPos = _.range(this.props.listInfo.length).map(() => this.scrollYInputRange[0]);
  }

  _handlePageVerticalScroll(e, index, relayCallback) {
    if (index === this._perfIndex) {
      Perf.printWasted();
      Perf.stop();
      this._perfIndex = null;
    }
    const offsetY = e && e.nativeEvent && e.nativeEvent.contentOffset && e.nativeEvent.contentOffset.y;
    if (index === this.getCurrentScrollableIndex()) {
      if ((this._isScrollYInRange(offsetY, index) || this._isContentSmall(index)) && typeof this._scrollDests[index] !== 'number') {
        this._driveVerticalScrollAnimation(offsetY, () => (this._verticalScrollPos[index] = offsetY));
      } else {
        this._verticalScrollPos[index] = offsetY;
      }
    } else {
      this._verticalScrollPos[index] = offsetY;
    }
    {
      const dest = this._scrollDests[index];
      if (typeof dest === 'number') {
        if (offsetY < dest + 1 && offsetY > dest - 1) {
          this._scrollDests[index] = null;
        }
      }
    }
    relayCallback && relayCallback(e);
  }

  _handleScrollBeginDrag(index) {
    this._driveVerticalScrollAnimation(
      this._verticalScrollPos[index],
      () => (this._scrollDests[index] = null),
      200
    );
  }

  _driveVerticalScrollAnimation(scrollY, callback = null, duration = 16) {
    Animated.timing(
      this.state.scrollY,
      {
        duration,
        toValue: scrollY
      }
    ).start(callback);
  }

  _handlePageContentLayout(height, index) {
    // assumption: the value of e dont change too much, and this method is called only before user interaction for each scrollView
    const size = { height:this._getPageContentHeight(index) };
    if (typeof height === 'number') {
      size.height = height;
      this._pageContentLayoutInfo[index] = size;
    }
  }

  _getPageContentHeight(index) {
    const layout = this._pageContentLayoutInfo[index];
    if (!layout || typeof layout.height !== 'number') {
      return this._defaultPageContentHeight();
    } else {
      return layout.height;
    }
  }

  _defaultPageContentHeight() {
    return ScreenH - this.props.navHeightDown - this.headerLayoutHeight - 49; // 49 is height of tabbar
  }

  render() {
    return (
      <View style={styles.container} >
        <ScrollView
          horizontal
          pagingEnabled
          scrollEventThrottle={16}
          style={styles.hScroll}
          onMomentumScrollEnd={e => this._handleHorizontalScrollChange(e)}
          onScroll={e => this._handleOnScroll(e)}
          ref={hScroll => (this._hScroll = hScroll)}
          automaticallyAdjustContentInsets={false}
        >
          {this._renderPageList()}
        </ScrollView>
        {this._renderHeader()}
      </View>
    );
  }

  _handleOnScroll(e) {
    this._updateScrollableIndex(e);
  }

  _handleHorizontalScrollChange(e) {
    this._pauseSetCurrentScrollableIndex = false;
    this._updateScrollableIndex(e);
  }

  _updateScrollableIndex(e) {
    const offset = e && e.nativeEvent && e.nativeEvent.contentOffset;
    if (offset) {
      this.setCurrentScrollableIndex(Math.floor((ScreenW / 2.0 + offset.x) / ScreenW));
    }
  }

  _renderHeader() {
    const headerInfo = this.props.headerInfo && { ...this.props.headerInfo };
    if (!headerInfo) {
      return null;
    }

    const headerProps = headerInfo.props && { ...headerInfo.props } || {}; headerInfo.props = headerProps;
    // onLayout
    const onLayoutOld = headerProps.onLayout;
    headerProps.onLayout = e => this._onHeaderLayout(e, onLayoutOld);
    headerProps.onHiddenPartLayout = e => this._onHeaderHiddenPartLayout(e);

    return (
      <Animated.View
        style={[styles.header, { top:this._headerTopAnimation() }]}
      >
        <headerInfo.component
          {...headerInfo.props}
          ref={ref => (this._headerRef = ref)}
        />
      </Animated.View>
    );
  }

  get scrollYInputRange() {
    const scrollDownBound = -this.props.navHeightDown - this.headerLayoutHeight;
    const scrollUpBound = -this.props.navHeightDown - (this.headerLayoutHeight - this.headerHiddenPartLayoutHeight + this.props.navHeightUp);
    return [scrollDownBound, scrollUpBound];
  }

  get scrollYOutputRange() {
    const ret = [this.props.navHeightDown, -(this.headerHiddenPartLayoutHeight - this.props.navHeightUp)];
    return ret;
  }

  _headerTopAnimation() {
    if (this.headerLayoutHeight <= 0) {
      return 0;
    }
    const inputRange = this.scrollYInputRange;
    const outputRange = this.scrollYOutputRange;
    return this.state.scrollY.interpolate({
      inputRange,
      outputRange,
      extrapolate:'clamp',
    });
  }

  _renderPageList() {
    if (this.headerLayoutHeight === 0) {
      return null;
    }
    const listInfo = [...this.props.listInfo];
    const ret = listInfo.map((componentInfo, index) => {
      const props = componentInfo.props && { ...componentInfo.props } || {};
      const oldOnScroll = props.onScroll;
      props.onScroll = e => this._handlePageVerticalScroll(e, index, oldOnScroll);
      props.onContentSizeChange = (w, h) => this._handlePageContentLayout(h, index);
      const oldOnScrollAnimationEnd = props.onMomentumScrollEnd;
      props.onMomentumScrollEnd = (e) => {
        oldOnScrollAnimationEnd && oldOnScrollAnimationEnd(e);
      };
      props.contentInset = { top:this.headerLayoutHeight, left:0, bottom:0, right:0 };
      props.ref = scrollable => this._installPage(scrollable, index);
      props.automaticallyAdjustContentInsets = false;
      props.onScrollBeginDrag = () => {
        this._handleScrollBeginDrag(index);
      };
      let { style, ...other } = props;
      // fixme: how to do this without hack on width
      const extraStyle = { width:ScreenW };
      if (Array.isArray(style)) {
        style.push(extraStyle);
      } else {
        style = [style, extraStyle];
      }
      return (
        <componentInfo.component
          key={`OctopusView-list${index}`}
          style={style}
          {...other}
        />
      );
    });
    return ret;
  }

  _installPage(page, index) {
    this._vScrollables[index] = page;
  }
}

OctopusView.propTypes = {
  headerInfo: PropTypes.shape({
    // component need to handle two onLayout props:
    // 1, the outer head view's - onLayout -
    // 2, optionally, the part of view that will be completely hide when scrolled up -- onHiddenPartLayout
    component: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    props: PropTypes.object,
  }),
  listInfo: PropTypes.arrayOf(PropTypes.shape({
    // must be able to accept and handle onScroll prop and onContentSizeChange  prop
    component: PropTypes.oneOfType([PropTypes.string, PropTypes.func]).isRequired,
    props: PropTypes.object,
  })).isRequired,
  navHeightUp: PropTypes.number,
  navHeightDown: PropTypes.number,

  onPageChange: PropTypes.func,
  visiblePage: PropTypes.number,
  getHeaderScrollAnimValue: PropTypes.func,
};

OctopusView.defaultProps = {
  // these value includes statusBar height
  // have to experiment with situations where navHeightUp != 0
  navHeightUp: 64,
  navHeightDown: 0,
};

let styles = StyleSheet.create({
  container: {
    flex:1,
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hScroll: {
    flex: 1,
    alignSelf: 'stretch',
  },
});
