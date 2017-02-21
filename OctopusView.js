//@flow

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

const { width:ScreenW, height:ScreenH } = Dimensions.get('window');

export default class OctopusView extends Component {
  constructor(props) {
    super(props);

    this.state = { scrollY: new Animated.Value(0) };
    this._headerLayoutHeight = 0;
    this._headerHiddenPartLayoutHeight = 0;

    this._pageContentLayoutInfo = [];
    this._hScrollables = [];

    // default showing the first scrollable view
    this._currentScrollableIndex = 0;
    this._currentVerticalScroll = this.scrollYInputRange[0];

    this._scrollDests = {};
    this._scrollPositions = {};
  }

  componentWillReceiveProps(nextProps) {
    const visiblePage = (nextProps && nextProps.visiblePage) || 0;
    if (this._currentScrollableIndex !== visiblePage) {
      this._currentScrollableIndex = visiblePage;
      this._hScroll && this._hScroll.scrollTo({ x:this._currentScrollableIndex * ScreenW });
    }
  }

  get headerLayoutHeight() {
    // console.log('headerLayoutHeight: ', this._headerLayoutHeight);
    return this._headerLayoutHeight;
  }

  get headerHiddenPartLayoutHeight() {
    if (this._headerHiddenPartLayoutHeight > 0) {
      return this._headerHiddenPartLayoutHeight;
    } else {
      return this.headerLayoutHeight;
    }
  }

  get currentScrollableIndex() {
    return this._currentScrollableIndex;
  }

  set currentScrollableIndex(index) {
    // console.log('original currentScrollableIndex, currentScrollableIndex: ', this._currentScrollableIndex, index);
    if (index !== this.currentScrollableIndex) {
      this._handlePageChange(this.currentScrollableIndex, index);
      this.props && this.props.onPageChange && this.props.onPageChange(index);
    }
    this._currentScrollableIndex = index;
  }

  _handlePageChange(oldIndex, newIndex) {
    const defaultContentHeight = this._defaultPageContentHeight();
    const scrollYInputRange = this.scrollYInputRange;

    const currentVerticalScroll = this._currentVerticalScroll;
    const contentHeight = this._getPageContentHeight(newIndex);

    const maxPossibleScrollY = scrollYInputRange[0] + Math.max(0, contentHeight - defaultContentHeight);
    const updateCurrentScrollY = Math.min(maxPossibleScrollY, currentVerticalScroll);
    const newScrollable = this._hScrollables[newIndex];
    // console.log('sync scroll for index, oldIndex was: ', updateCurrentScrollY, newIndex, oldIndex);
    if (newScrollable) {
      this._driveVerticalScrollAnimation(updateCurrentScrollY, () => { this._currentVerticalScroll = updateCurrentScrollY; }, 300);
      const lastScrollY = this._scrollPositions[newIndex];
      if (typeof lastScrollY !== 'number' || updateCurrentScrollY !== lastScrollY) {
        this._headerAnimationForbid = true;
      }
      this._scrollDests[newIndex] = updateCurrentScrollY;
      newScrollable.scrollTo({ y:updateCurrentScrollY });
      // fixme: this is a hack, normally onScroll callback will be called and so next statement will be called accordingly, but somesimtes it does not get called, so ...
    } else {
      console.error('no ref to horizontal scrollable at index: ', newIndex);
    }
  }

  _handleHeaderLayout(e, relayCallback) {
    // assumption: the value of e dont change too much, and this method is called only before user interaction
    //
    let height = 0;
    e && e.nativeEvent && e.nativeEvent.layout && Object.prototype.hasOwnProperty.call(e.nativeEvent.layout, 'height') &&
    (height = e.nativeEvent.layout.height);
    !Number.isNaN(height) && (this._headerLayoutHeight = height);
    this.forceUpdate();

    relayCallback && relayCallback(e);
  }

  _handleHeaderHiddenPartLayout(e) {
    // assumption: the value of e dont change too much, and this method is called only before user interaction
    let height = 0;
    e && e.nativeEvent && e.nativeEvent.layout && Object.prototype.hasOwnProperty.call(e.nativeEvent.layout.hasOwnProperty, 'height') &&
    (height = e.nativeEvent.layout.height);
    !Number.isNaN(height) && (this._headerHiddenPartLayoutHeight = height);
    this.forceUpdate();
  }

  _checkReachDest(e, index) {
    const dest = this._scrollDests[index];
    if (typeof dest === 'number') {
      const offsetY = e && e.nativeEvent && e.nativeEvent.contentOffset && e.nativeEvent.contentOffset.y;
      if (dest === offsetY) {
        this._scrollDests[index] = null;
        this._headerAnimationForbid = false;
      }
    }
  }

  _handlePageVerticalScroll(e, index, relayCallback) {
    // assumption: the value of e dont change too much, and this method is called only before user interaction
    const offsetY = e && e.nativeEvent && e.nativeEvent.contentOffset && e.nativeEvent.contentOffset.y;
    this._checkReachDest(e, index);
    if (index === this._currentScrollableIndex) {
      // console.log('vertical scroll info, index: ', index, e && e.nativeEvent);
      if (typeof offsetY === 'number') {
        this._driveVerticalScrollAnimation(offsetY, () => { this._currentVerticalScroll = offsetY; });
      }
    } else {
      // console.log('missed scroll sync, index, currentScrollableIndex: ', index, this._currentScrollableIndex, e && e.nativeEvent);
    }

    this._scrollPositions[index] = offsetY;

    relayCallback && relayCallback(e);
  }

  _driveVerticalScrollAnimation(scrollY, callback = null, duration = 20) {
    if (this._headerAnimationForbid) {
      callback && callback();
      return;
    }
    // console.log('will timging to value: ', scrollY);
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
    return ScreenH - this.props.navHeightDown - this.headerLayoutHeight;
  }

  _handleHorizontalScrollChange(e) {
    // console.log('horizontal scroll animation ended.');
    this._updateScrollableIndex(e);
  }

  _handleHScrollOffsetChange(e) {
    this._updateScrollableIndex(e);
  }

  _updateScrollableIndex(e) {
    // console.log('horizontal scroll: ', e.nativeEvent);
    const offset = e && e.nativeEvent && e.nativeEvent.contentOffset;
    if (offset) {
      this.currentScrollableIndex = Math.floor((ScreenW / 2.0 + offset.x) / ScreenW);
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
    headerProps.onLayout = e => this._handleHeaderLayout(e, onLayoutOld);
    headerProps.onHiddenPartLayout = e => this._handleHeaderHiddenPartLayout(e);

    return (
      <Animated.View style={[styles.header, { top:this._headerTopAnimation() }]} >
        <headerInfo.component {...headerInfo.props} />
      </Animated.View>
    );
  }

  get scrollYInputRange() {
    const scrollDownBound = -this.props.navHeightDown - this.headerLayoutHeight;
    const scrollUpBound = -this.props.navHeightDown - (this.headerLayoutHeight - this.headerHiddenPartLayoutHeight);
    // console.log('scrollYInputRange: ', scrollDownBound, scrollUpBound);
    return [scrollDownBound, scrollUpBound];
  }

  get scrollYOutputRange() {
    const ret = [this.props.navHeightDown, -(this.headerHiddenPartLayoutHeight - this.props.navHeightUp)];
    // console.log('scrollYOutputRange: ', ret[0], ret[1]);
    return ret;
  }

  _headerTopAnimation() {
    if (this.headerLayoutHeight <= 0) {
      return 0;
    }
    const inputRange = this.scrollYInputRange;
    const outputRange = this.scrollYOutputRange;
    // console.log('header container top animation inputRange, outputRange: ', inputRange, outputRange);
    return this.state.scrollY.interpolate({
      inputRange,
      outputRange,
      extrapolate:'clamp',
    });
  }

  _renderPageList() {
    // console.log('rendering page list');
    const listInfo = [...this.props.listInfo];
    const ret = listInfo.map((componentInfo, index) => {
      const props = componentInfo.props && { ...componentInfo.props } || {};
      const oldOnScroll = props.onScroll;
      props.onScroll = e => this._handlePageVerticalScroll(e, index, oldOnScroll);
      props.onContentSizeChange = (w, h) => this._handlePageContentLayout(h, index);
      const oldOnScrollAnimationEnd = props.onMomentumScrollEnd;
      props.onMomentumScrollEnd = (e) => { this._headerAnimationForbid = false; oldOnScrollAnimationEnd && oldOnScrollAnimationEnd(e); };
      props.contentInset = { top:this.headerLayoutHeight, left:0, bottom:0, right:0 };
      props.ref = (scrollable) => { this._installPage(scrollable, index); };
      props.automaticallyAdjustContentInsets = false;
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
    if (!this._hScrollables[index]) {
      // first install, do some hack
      (index === 0) && page && page.scrollTo({ y:this.scrollYInputRange[0] });
    }
    this._hScrollables[index] = page;
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
          onScroll={e => this._handleHScrollOffsetChange(e)}
          ref={hScroll => (this._hScroll = hScroll)}
        >
          {this._renderPageList()}
        </ScrollView>
        {this._renderHeader()}
      </View>
    );
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
